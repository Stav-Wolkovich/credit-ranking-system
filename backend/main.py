"""
Backend for the internal ranking (דירוג פנימי) back-office application.

Ranking data is persisted in SQLite (see database.py) rather than kept
in-memory, so it survives restarts and can be queried/updated like a real
data store.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from . import database

app = FastAPI(title="Internal Ranking API", version="0.1.0")

database.init_db()

# Dev CORS: the Vite dev server runs on a different port than the API.
# Tighten this to your real frontend origin(s) before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


NAV_ITEMS = [
    {"id": "details", "label": "פירוט"},
    {"id": "report", "label": "דוח דירוג פנימי"},
    {"id": "processes", "label": "תהליכי דירוג"},
    {"id": "approvals", "label": "תור אישורים"},
    {"id": "issuers", "label": "מנפיקים"},
    {"id": "assets", "label": "נכסים"},
    {"id": "master-data", "label": "נתוני אב"},
    {"id": "models", "label": "מודלים"},
    {"id": "questionnaires", "label": "שאלונים"},
    {"id": "matrices", "label": "מטריצות"},
    {"id": "teams", "label": "צוותים"},
    {"id": "system", "label": "מערכת"},
    {"id": "users", "label": "משתמשים"},
    {"id": "audit-log", "label": "יומן ביקורת"},
]


def compute_summary(expiring_within_days: int = 60):
    return {
        "expiring_soon": database.count_rankings_expiring_within(expiring_within_days),
        "expiring_within_days": expiring_within_days,
        "awaiting_approval": database.count_rankings_by_status("ממתין לאישור"),
        "in_progress": database.count_rankings_by_status("בעבודה"),
        "in_force": database.count_rankings_by_status("בתוקף"),
        "total_processes": database.count_rankings() * 3,  # placeholder metric, matches "24 processes" in the mock
        "last_updated": date.today().isoformat(),
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StatusUpdate(BaseModel):
    status: str
    tone: Optional[str] = None


class IssuerInput(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    sector: Optional[str] = None
    country: Optional[str] = None


class ModelInput(BaseModel):
    id: str
    name: str
    family: str
    domain: str
    owner: str
    description: Optional[str] = None
    questionnaire_ids: List[str] = []


class ParameterInput(BaseModel):
    name: str
    type: str
    weight: int = 0
    answers: List[str] = []


class QuestionnaireInput(BaseModel):
    id: str
    name: str
    calculation_method: str
    description: Optional[str] = None
    parameters: List[ParameterInput] = []


class QuestionnaireDuplicateInput(BaseModel):
    id: str
    name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True}


NAV_COUNTS = {
    "report": database.count_rankings,
    "processes": database.count_processes,
    "issuers": database.count_issuers,
    "models": database.count_models,
    "questionnaires": database.count_questionnaires,
}


@app.get("/api/nav")
def get_nav():
    return [
        {**item, "count": NAV_COUNTS[item["id"]]()} if item["id"] in NAV_COUNTS else item
        for item in NAV_ITEMS
    ]


@app.get("/api/report")
def get_report(expiring_within_days: int = Query(default=60, ge=0)):
    """Everything the main ranking-report page needs in one call."""
    return {
        "summary": compute_summary(expiring_within_days),
        "rows": database.get_all_rankings(),
    }


@app.get("/api/report/rows/{process_id}")
def get_row(process_id: str):
    row = database.get_ranking(process_id)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    return row


@app.patch("/api/report/rows/{process_id}/status")
def update_status(process_id: str, update: StatusUpdate):
    if not database.get_ranking(process_id):
        raise HTTPException(status_code=404, detail="Process not found")
    return database.update_ranking_status(process_id, update.status, update.tone)


@app.get("/api/processes")
def get_processes():
    """Everything the ranking-processes page needs in one call."""
    rows = database.get_all_processes()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


@app.get("/api/issuers")
def get_issuers():
    """Everything the issuers page needs in one call."""
    rows = database.get_all_issuers()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


def _clean_issuer_input(payload: IssuerInput):
    issuer_id = payload.id.strip()
    name = payload.name.strip()
    if not issuer_id or not name:
        raise HTTPException(status_code=422, detail="קוד מנפיק ושם מנפיק הם שדות חובה")
    return {
        "id": issuer_id,
        "name": name,
        "type": (payload.type or "").strip() or None,
        "sector": (payload.sector or "").strip() or None,
        "country": (payload.country or "").strip() or None,
    }


@app.post("/api/issuers", status_code=201)
def create_issuer(payload: IssuerInput):
    cleaned = _clean_issuer_input(payload)
    if database.issuer_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="מנפיק עם קוד זה כבר קיים")
    if database.issuer_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="מנפיק עם שם זה כבר קיים")
    return database.create_issuer(**cleaned)


@app.put("/api/issuers/{issuer_id}")
def update_issuer(issuer_id: str, payload: IssuerInput):
    if not database.get_issuer(issuer_id):
        raise HTTPException(status_code=404, detail="מנפיק לא נמצא")
    cleaned = _clean_issuer_input(payload)
    if database.issuer_code_taken(cleaned["id"], exclude_id=issuer_id):
        raise HTTPException(status_code=409, detail="מנפיק עם קוד זה כבר קיים")
    if database.issuer_name_taken(cleaned["name"], exclude_id=issuer_id):
        raise HTTPException(status_code=409, detail="מנפיק עם שם זה כבר קיים")
    return database.update_issuer(issuer_id, **cleaned)


@app.delete("/api/issuers/{issuer_id}", status_code=204)
def delete_issuer(issuer_id: str):
    if not database.get_issuer(issuer_id):
        raise HTTPException(status_code=404, detail="מנפיק לא נמצא")
    database.delete_issuer(issuer_id)


@app.get("/api/models")
def get_models():
    """Everything the models page needs in one call."""
    rows = database.get_all_models()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


def _clean_model_input(payload: ModelInput):
    model_id = payload.id.strip()
    name = payload.name.strip()
    family = payload.family.strip()
    domain = payload.domain.strip()
    owner = payload.owner.strip()
    if not model_id or not name or not family or not domain or not owner:
        raise HTTPException(status_code=422, detail="כל השדות הם שדות חובה")
    return {
        "id": model_id,
        "name": name,
        "family": family,
        "domain": domain,
        "owner": owner,
        "description": (payload.description or "").strip() or None,
        "questionnaire_ids": payload.questionnaire_ids,
    }


@app.post("/api/models", status_code=201)
def create_model(payload: ModelInput):
    cleaned = _clean_model_input(payload)
    if database.model_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="מודל עם קוד זה כבר קיים")
    if database.model_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="מודל עם שם זה כבר קיים")
    return database.create_model(**cleaned, last_updated=date.today().strftime("%d/%m/%Y"))


@app.put("/api/models/{model_id}")
def update_model(model_id: str, payload: ModelInput):
    if not database.get_model(model_id):
        raise HTTPException(status_code=404, detail="מודל לא נמצא")
    cleaned = _clean_model_input(payload)
    if database.model_code_taken(cleaned["id"], exclude_id=model_id):
        raise HTTPException(status_code=409, detail="מודל עם קוד זה כבר קיים")
    if database.model_name_taken(cleaned["name"], exclude_id=model_id):
        raise HTTPException(status_code=409, detail="מודל עם שם זה כבר קיים")
    return database.update_model(model_id, **cleaned, last_updated=date.today().strftime("%d/%m/%Y"))


@app.delete("/api/models/{model_id}", status_code=204)
def delete_model(model_id: str):
    if not database.get_model(model_id):
        raise HTTPException(status_code=404, detail="מודל לא נמצא")
    database.delete_model(model_id)


@app.get("/api/questionnaires")
def get_questionnaires():
    rows = database.get_all_questionnaires()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


@app.get("/api/questionnaires/{questionnaire_id}")
def get_questionnaire(questionnaire_id: str):
    questionnaire = database.get_questionnaire(questionnaire_id)
    if not questionnaire:
        raise HTTPException(status_code=404, detail="שאלון לא נמצא")
    return questionnaire


def _clean_questionnaire_input(payload: QuestionnaireInput):
    questionnaire_id = payload.id.strip()
    name = payload.name.strip()
    if not questionnaire_id or not name:
        raise HTTPException(status_code=422, detail="קוד שאלון ושם שאלון הם שדות חובה")
    parameters = [
        {
            "name": p.name.strip(),
            "type": p.type,
            "weight": p.weight,
            "answers": [a.strip() for a in p.answers if a.strip()],
        }
        for p in payload.parameters
    ]
    return {
        "id": questionnaire_id,
        "name": name,
        "calculation_method": payload.calculation_method,
        "description": (payload.description or "").strip() or None,
        "parameters": parameters,
    }


@app.post("/api/questionnaires", status_code=201)
def create_questionnaire(payload: QuestionnaireInput):
    cleaned = _clean_questionnaire_input(payload)
    if database.questionnaire_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="שאלון עם קוד זה כבר קיים")
    if database.questionnaire_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="שאלון עם שם זה כבר קיים")
    return database.create_questionnaire(**cleaned, created_date=date.today().strftime("%d/%m/%Y"))


@app.put("/api/questionnaires/{questionnaire_id}")
def update_questionnaire(questionnaire_id: str, payload: QuestionnaireInput):
    if not database.get_questionnaire(questionnaire_id):
        raise HTTPException(status_code=404, detail="שאלון לא נמצא")
    cleaned = _clean_questionnaire_input(payload)
    if database.questionnaire_code_taken(cleaned["id"], exclude_id=questionnaire_id):
        raise HTTPException(status_code=409, detail="שאלון עם קוד זה כבר קיים")
    if database.questionnaire_name_taken(cleaned["name"], exclude_id=questionnaire_id):
        raise HTTPException(status_code=409, detail="שאלון עם שם זה כבר קיים")
    return database.update_questionnaire(questionnaire_id, **cleaned)


@app.delete("/api/questionnaires/{questionnaire_id}", status_code=204)
def delete_questionnaire(questionnaire_id: str):
    if not database.get_questionnaire(questionnaire_id):
        raise HTTPException(status_code=404, detail="שאלון לא נמצא")
    database.delete_questionnaire(questionnaire_id)


@app.post("/api/questionnaires/{questionnaire_id}/duplicate", status_code=201)
def duplicate_questionnaire(questionnaire_id: str, payload: QuestionnaireDuplicateInput):
    source = database.get_questionnaire(questionnaire_id)
    if not source:
        raise HTTPException(status_code=404, detail="שאלון לא נמצא")
    new_id = payload.id.strip()
    new_name = payload.name.strip()
    if not new_id or not new_name:
        raise HTTPException(status_code=422, detail="קוד שאלון ושם שאלון הם שדות חובה")
    if database.questionnaire_code_taken(new_id):
        raise HTTPException(status_code=409, detail="שאלון עם קוד זה כבר קיים")
    if database.questionnaire_name_taken(new_name):
        raise HTTPException(status_code=409, detail="שאלון עם שם זה כבר קיים")
    return database.duplicate_questionnaire(
        questionnaire_id, new_id, new_name, created_date=date.today().strftime("%d/%m/%Y")
    )
