"""
Backend for the internal ranking (דירוג פנימי) back-office application.

Ranking data is persisted in SQLite (see database.py) rather than kept
in-memory, so it survives restarts and can be queried/updated like a real
data store.
"""
import csv
import io

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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
    {"id": "report", "label": "דוח דירוג פנימי"},
    {"id": "processes", "label": "תהליכי דירוג"},
    {"id": "approvals", "label": "תור אישורים"},
    {"id": "issuers", "label": "מנפיקים"},
    {"id": "assets", "label": "נכסים"},
    {"id": "models", "label": "מודלים"},
    {"id": "rating-scales", "label": "סולמות דירוג"},
    {"id": "questionnaires", "label": "שאלונים"},
    {"id": "matrices", "label": "מטריצות"},
    {"id": "teams", "label": "צוותים"},
    {"id": "roles", "label": "תפקידים"},
    {"id": "users", "label": "משתמשים"},
    {"id": "reports", "label": "דוחות"},
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


class AssetInput(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    issuer_id: Optional[str] = None
    cycle_stage: Optional[str] = None


class TeamInput(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    process_kind: Optional[str] = None
    committee_submission: bool = False
    validity_tracking: bool = False


class ModelQuestionnaireInput(BaseModel):
    id: str
    weight: int = 0


class ModelInput(BaseModel):
    id: str
    name: str
    family: str
    domain: str
    owner: str
    description: Optional[str] = None
    questionnaires: List[ModelQuestionnaireInput] = []
    rating_scale_id: Optional[str] = None


class RatingScaleLevelInput(BaseModel):
    label: str
    min_value: float
    max_value: float


class RatingScaleInput(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    levels: List[RatingScaleLevelInput] = []


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


class RoleInput(BaseModel):
    id: str
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_approve: bool = False
    can_committee_approve: bool = False
    can_rerun: bool = False


class UserInput(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    role_ids: List[str] = []


class MatrixInput(BaseModel):
    id: str
    name: str
    type: str
    model_id: str
    axes: int = 2
    cells: int = 0
    description: Optional[str] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    x_values: List[str] = []
    y_values: List[str] = []
    cell_values: List[List[float]] = []


class MatrixDuplicateInput(BaseModel):
    id: str
    name: str


class ReportInput(BaseModel):
    id: str
    title: str
    purpose: Optional[str] = None
    content: Optional[str] = None
    export_formats: List[str] = ["PDF", "Excel"]


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
    "assets": database.count_assets,
    "models": database.count_models,
    "rating-scales": database.count_rating_scales,
    "questionnaires": database.count_questionnaires,
    "approvals": lambda: (
        database.count_processes_by_status("בתהליך") + database.count_processes_by_status("ממתין לוועדה")
    ),
    "users": database.count_users,
    "matrices": database.count_matrices,
    "teams": database.count_teams,
    "roles": database.count_roles,
    "reports": database.count_reports,
}


@app.get("/api/nav")
def get_nav():
    return [
        {**item, "count": NAV_COUNTS[item["id"]]()} if item["id"] in NAV_COUNTS else item
        for item in NAV_ITEMS
    ]


@app.get("/api/report")
def get_report():
    """Everything the main ranking-report page needs in one call."""
    return {
        "summary": compute_summary(),
        "rows": database.get_all_rankings(),
    }


@app.get("/api/report/expiring-soon")
def get_expiring_soon(expiring_within_days: int = Query(default=60, ge=0)):
    """Lightweight endpoint backing the customizable יפוגו תוך box, so
    changing the day count doesn't refetch (and re-render) the whole page."""
    return {
        "expiring_soon": database.count_rankings_expiring_within(expiring_within_days),
        "expiring_within_days": expiring_within_days,
    }


@app.get("/api/approvals/manager")
def get_manager_approvals():
    """Processes awaiting review by a manager (stage 1 of the approvals queue)."""
    rows = database.get_processes_by_status("בתהליך")
    return {"rows": rows, "total": len(rows)}


@app.get("/api/approvals/committee")
def get_committee_approvals():
    """Processes awaiting review by the ועדה (stage 2 of the approvals queue)."""
    rows = database.get_processes_by_status("ממתין לוועדה")
    return {"rows": rows, "total": len(rows)}


@app.post("/api/approvals/{process_id}/approve-manager")
def approve_manager(process_id: str):
    process = database.get_process(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="תהליך לא נמצא")
    if process["status"] != "בתהליך":
        raise HTTPException(status_code=409, detail="התהליך אינו ממתין לאישור מנהל")
    return database.update_process_status(process_id, "ממתין לוועדה", "amber")


@app.post("/api/approvals/{process_id}/approve-committee")
def approve_committee(process_id: str):
    process = database.get_process(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="תהליך לא נמצא")
    if process["status"] != "ממתין לוועדה":
        raise HTTPException(status_code=409, detail="התהליך אינו ממתין לאישור ועדה")
    return database.update_process_status(process_id, "אושר בוועדה", "green")


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


class ProcessCreateInput(BaseModel):
    model_id: str
    kind: str
    framework_issuer_id: Optional[str] = None
    framework_asset_id: Optional[str] = None
    data_date: Optional[str] = None


@app.post("/api/processes", status_code=201)
def create_process(payload: ProcessCreateInput):
    if payload.kind not in ("מנפיק", "נכס"):
        raise HTTPException(status_code=422, detail="סוג מסגרת לא תקין")
    if not database.get_model(payload.model_id):
        raise HTTPException(status_code=422, detail="מודל דירוג לא נמצא")
    if payload.kind == "מנפיק":
        if not payload.framework_issuer_id or not database.get_issuer(payload.framework_issuer_id):
            raise HTTPException(status_code=422, detail="יש לבחור מנפיק קיים")
        framework_asset_id = None
    else:
        asset = database.get_asset(payload.framework_asset_id or "")
        if not asset:
            raise HTTPException(status_code=422, detail="יש לבחור נכס קיים")
        framework_asset_id = asset["id"]
    return database.create_ranking_process(
        model_id=payload.model_id,
        kind=payload.kind,
        framework_issuer_id=payload.framework_issuer_id,
        framework_asset_id=framework_asset_id,
        data_date=payload.data_date,
    )


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


@app.get("/api/assets")
def get_assets():
    """Everything the assets page needs in one call."""
    rows = database.get_all_assets()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


def _clean_asset_input(payload: AssetInput):
    asset_id = payload.id.strip()
    name = payload.name.strip()
    if not asset_id or not name:
        raise HTTPException(status_code=422, detail="קוד נכס ושם נכס הם שדות חובה")
    return {
        "id": asset_id,
        "name": name,
        "type": (payload.type or "").strip() or None,
        "issuer_id": (payload.issuer_id or "").strip() or None,
        "cycle_stage": (payload.cycle_stage or "").strip() or None,
    }


@app.post("/api/assets", status_code=201)
def create_asset(payload: AssetInput):
    cleaned = _clean_asset_input(payload)
    if database.asset_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="נכס עם קוד זה כבר קיים")
    return database.create_asset(**cleaned)


@app.put("/api/assets/{asset_id}")
def update_asset(asset_id: str, payload: AssetInput):
    if not database.get_asset(asset_id):
        raise HTTPException(status_code=404, detail="נכס לא נמצא")
    cleaned = _clean_asset_input(payload)
    if database.asset_code_taken(cleaned["id"], exclude_id=asset_id):
        raise HTTPException(status_code=409, detail="נכס עם קוד זה כבר קיים")
    return database.update_asset(asset_id, **cleaned)


@app.get("/api/teams")
def get_teams():
    rows = database.get_all_teams()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


def _clean_team_input(payload: TeamInput):
    team_id = payload.id.strip()
    name = payload.name.strip()
    if not team_id or not name:
        raise HTTPException(status_code=422, detail="קוד צוות ושם צוות הם שדות חובה")
    return {
        "id": team_id,
        "name": name,
        "type": (payload.type or "").strip() or None,
        "process_kind": (payload.process_kind or "").strip() or None,
        "committee_submission": payload.committee_submission,
        "validity_tracking": payload.validity_tracking,
    }


@app.post("/api/teams", status_code=201)
def create_team(payload: TeamInput):
    cleaned = _clean_team_input(payload)
    if database.team_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="צוות עם קוד זה כבר קיים")
    if database.team_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="צוות עם שם זה כבר קיים")
    return database.create_team(**cleaned)


@app.put("/api/teams/{team_id}")
def update_team(team_id: str, payload: TeamInput):
    if not database.get_team(team_id):
        raise HTTPException(status_code=404, detail="צוות לא נמצא")
    cleaned = _clean_team_input(payload)
    if database.team_code_taken(cleaned["id"], exclude_id=team_id):
        raise HTTPException(status_code=409, detail="צוות עם קוד זה כבר קיים")
    if database.team_name_taken(cleaned["name"], exclude_id=team_id):
        raise HTTPException(status_code=409, detail="צוות עם שם זה כבר קיים")
    return database.update_team(team_id, **cleaned)


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
    questionnaires = [
        {"id": q.id.strip(), "weight": max(0, min(100, q.weight))}
        for q in payload.questionnaires
        if q.id.strip()
    ]
    return {
        "id": model_id,
        "name": name,
        "family": family,
        "domain": domain,
        "owner": owner,
        "description": (payload.description or "").strip() or None,
        "questionnaires": questionnaires,
        "rating_scale_id": (payload.rating_scale_id or "").strip() or None,
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


@app.get("/api/rating-scales")
def get_rating_scales():
    rows = database.get_all_rating_scales()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


@app.get("/api/rating-scales/{rating_scale_id}")
def get_rating_scale(rating_scale_id: str):
    scale = database.get_rating_scale(rating_scale_id)
    if not scale:
        raise HTTPException(status_code=404, detail="סולם דירוג לא נמצא")
    return scale


def _clean_rating_scale_input(payload: RatingScaleInput):
    scale_id = payload.id.strip()
    name = payload.name.strip()
    if not scale_id or not name:
        raise HTTPException(status_code=422, detail="קוד סולם ושם סולם הם שדות חובה")
    levels = []
    for lvl in payload.levels:
        label = lvl.label.strip()
        if not label:
            continue
        if lvl.min_value > lvl.max_value:
            raise HTTPException(status_code=422, detail=f"טווח לא תקין עבור '{label}': המינימום גדול מהמקסימום")
        levels.append({"label": label, "min_value": lvl.min_value, "max_value": lvl.max_value})
    return {
        "id": scale_id,
        "name": name,
        "description": (payload.description or "").strip() or None,
        "levels": levels,
    }


@app.post("/api/rating-scales", status_code=201)
def create_rating_scale(payload: RatingScaleInput):
    cleaned = _clean_rating_scale_input(payload)
    if database.rating_scale_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="סולם דירוג עם קוד זה כבר קיים")
    if database.rating_scale_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="סולם דירוג עם שם זה כבר קיים")
    return database.create_rating_scale(**cleaned)


@app.put("/api/rating-scales/{rating_scale_id}")
def update_rating_scale(rating_scale_id: str, payload: RatingScaleInput):
    if not database.get_rating_scale(rating_scale_id):
        raise HTTPException(status_code=404, detail="סולם דירוג לא נמצא")
    cleaned = _clean_rating_scale_input(payload)
    if database.rating_scale_code_taken(cleaned["id"], exclude_id=rating_scale_id):
        raise HTTPException(status_code=409, detail="סולם דירוג עם קוד זה כבר קיים")
    if database.rating_scale_name_taken(cleaned["name"], exclude_id=rating_scale_id):
        raise HTTPException(status_code=409, detail="סולם דירוג עם שם זה כבר קיים")
    return database.update_rating_scale(rating_scale_id, **cleaned)


@app.delete("/api/rating-scales/{rating_scale_id}", status_code=204)
def delete_rating_scale(rating_scale_id: str):
    if not database.get_rating_scale(rating_scale_id):
        raise HTTPException(status_code=404, detail="סולם דירוג לא נמצא")
    database.delete_rating_scale(rating_scale_id)


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


@app.get("/api/roles")
def get_roles():
    rows = database.get_all_roles()
    return {"rows": rows, "total": len(rows)}


def _clean_role_input(payload: RoleInput):
    role_id = payload.id.strip()
    name = payload.name.strip()
    if not role_id or not name:
        raise HTTPException(status_code=422, detail="קוד תפקיד ושם תפקיד הם שדות חובה")
    return {
        "id": role_id,
        "name": name,
        "name_en": (payload.name_en or "").strip() or None,
        "description": (payload.description or "").strip() or None,
        "can_view": payload.can_view,
        "can_create": payload.can_create,
        "can_edit": payload.can_edit,
        "can_delete": payload.can_delete,
        "can_approve": payload.can_approve,
        "can_committee_approve": payload.can_committee_approve,
        "can_rerun": payload.can_rerun,
    }


@app.post("/api/roles", status_code=201)
def create_role(payload: RoleInput):
    cleaned = _clean_role_input(payload)
    if database.role_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="תפקיד עם קוד זה כבר קיים")
    if database.role_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="תפקיד עם שם זה כבר קיים")
    return database.create_role(**cleaned)


@app.put("/api/roles/{role_id}")
def update_role(role_id: str, payload: RoleInput):
    if not database.get_role(role_id):
        raise HTTPException(status_code=404, detail="תפקיד לא נמצא")
    cleaned = _clean_role_input(payload)
    if database.role_code_taken(cleaned["id"], exclude_id=role_id):
        raise HTTPException(status_code=409, detail="תפקיד עם קוד זה כבר קיים")
    if database.role_name_taken(cleaned["name"], exclude_id=role_id):
        raise HTTPException(status_code=409, detail="תפקיד עם שם זה כבר קיים")
    return database.update_role(role_id, **cleaned)


@app.get("/api/users")
def get_users():
    rows = database.get_all_users()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


def _clean_user_input(payload: UserInput):
    user_id = payload.id.strip()
    full_name = payload.full_name.strip()
    if not user_id or not full_name:
        raise HTTPException(status_code=422, detail="שם משתמש ושם מלא הם שדות חובה")
    return {
        "id": user_id,
        "full_name": full_name,
        "email": (payload.email or "").strip() or None,
        "role_ids": payload.role_ids,
    }


@app.post("/api/users", status_code=201)
def create_user(payload: UserInput):
    cleaned = _clean_user_input(payload)
    if database.username_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="שם משתמש זה כבר קיים")
    return database.create_user(**cleaned)


@app.put("/api/users/{user_id}")
def update_user(user_id: str, payload: UserInput):
    if not database.get_user(user_id):
        raise HTTPException(status_code=404, detail="משתמש לא נמצא")
    cleaned = _clean_user_input(payload)
    if database.username_taken(cleaned["id"], exclude_id=user_id):
        raise HTTPException(status_code=409, detail="שם משתמש זה כבר קיים")
    return database.update_user(user_id, **cleaned)


@app.get("/api/matrices")
def get_matrices():
    rows = database.get_all_matrices()
    return {
        "rows": rows,
        "total": len(rows),
        "last_updated": date.today().isoformat(),
    }


@app.get("/api/matrices/{matrix_id}")
def get_matrix(matrix_id: str):
    matrix = database.get_matrix(matrix_id)
    if not matrix:
        raise HTTPException(status_code=404, detail="מטריצה לא נמצאה")
    return matrix


def _clean_matrix_input(payload: MatrixInput):
    matrix_id = payload.id.strip()
    name = payload.name.strip()
    type_ = payload.type.strip()
    model_id = payload.model_id.strip()
    if not matrix_id or not name or not type_ or not model_id:
        raise HTTPException(status_code=422, detail="קוד, שם, סוג ומודל הם שדות חובה")
    if not database.get_model(model_id):
        raise HTTPException(status_code=422, detail="מודל לא נמצא")
    x_values = [v.strip() for v in payload.x_values if v.strip()]
    y_values = [v.strip() for v in payload.y_values if v.strip()]
    cell_values = payload.cell_values
    if x_values and y_values:
        if len(cell_values) != len(y_values) or any(len(row) != len(x_values) for row in cell_values):
            raise HTTPException(status_code=422, detail="מספר התאים אינו תואם לצירים שהוגדרו")
    else:
        x_values, y_values, cell_values = [], [], []
    return {
        "id": matrix_id,
        "name": name,
        "type": type_,
        "model_id": model_id,
        "axes": payload.axes,
        "cells": payload.cells,
        "description": (payload.description or "").strip() or None,
        "x_axis_label": (payload.x_axis_label or "").strip() or None,
        "y_axis_label": (payload.y_axis_label or "").strip() or None,
        "x_values": x_values,
        "y_values": y_values,
        "cell_values": cell_values,
    }


@app.post("/api/matrices", status_code=201)
def create_matrix(payload: MatrixInput):
    cleaned = _clean_matrix_input(payload)
    if database.matrix_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="מטריצה עם קוד זה כבר קיימת")
    if database.matrix_name_taken(cleaned["name"]):
        raise HTTPException(status_code=409, detail="מטריצה עם שם זה כבר קיימת")
    return database.create_matrix(**cleaned)


@app.put("/api/matrices/{matrix_id}")
def update_matrix(matrix_id: str, payload: MatrixInput):
    if not database.get_matrix(matrix_id):
        raise HTTPException(status_code=404, detail="מטריצה לא נמצאה")
    cleaned = _clean_matrix_input(payload)
    if database.matrix_code_taken(cleaned["id"], exclude_id=matrix_id):
        raise HTTPException(status_code=409, detail="מטריצה עם קוד זה כבר קיימת")
    if database.matrix_name_taken(cleaned["name"], exclude_id=matrix_id):
        raise HTTPException(status_code=409, detail="מטריצה עם שם זה כבר קיימת")
    return database.update_matrix(matrix_id, **cleaned)


@app.post("/api/matrices/{matrix_id}/duplicate", status_code=201)
def duplicate_matrix(matrix_id: str, payload: MatrixDuplicateInput):
    source = database.get_matrix(matrix_id)
    if not source:
        raise HTTPException(status_code=404, detail="מטריצה לא נמצאה")
    new_id = payload.id.strip()
    new_name = payload.name.strip()
    if not new_id or not new_name:
        raise HTTPException(status_code=422, detail="קוד ושם מטריצה הם שדות חובה")
    if database.matrix_code_taken(new_id):
        raise HTTPException(status_code=409, detail="מטריצה עם קוד זה כבר קיימת")
    if database.matrix_name_taken(new_name):
        raise HTTPException(status_code=409, detail="מטריצה עם שם זה כבר קיימת")
    return database.duplicate_matrix(matrix_id, new_id, new_name)


@app.get("/api/reports")
def get_reports():
    rows = database.get_all_reports()
    return {"rows": rows, "total": len(rows)}


def _clean_report_input(payload: ReportInput):
    report_id = payload.id.strip()
    title = payload.title.strip()
    if not report_id or not title:
        raise HTTPException(status_code=422, detail="קוד דוח וכותרת הם שדות חובה")
    return {
        "id": report_id,
        "title": title,
        "purpose": (payload.purpose or "").strip() or None,
        "content": (payload.content or "").strip() or None,
        "export_formats": payload.export_formats,
    }


@app.post("/api/reports", status_code=201)
def create_report(payload: ReportInput):
    cleaned = _clean_report_input(payload)
    if database.report_code_taken(cleaned["id"]):
        raise HTTPException(status_code=409, detail="דוח עם קוד זה כבר קיים")
    if database.report_title_taken(cleaned["title"]):
        raise HTTPException(status_code=409, detail="דוח עם כותרת זו כבר קיים")
    return database.create_report(**cleaned)


@app.put("/api/reports/{report_id}")
def update_report(report_id: str, payload: ReportInput):
    if not database.get_report(report_id):
        raise HTTPException(status_code=404, detail="דוח לא נמצא")
    cleaned = _clean_report_input(payload)
    if database.report_code_taken(cleaned["id"], exclude_id=report_id):
        raise HTTPException(status_code=409, detail="דוח עם קוד זה כבר קיים")
    if database.report_title_taken(cleaned["title"], exclude_id=report_id):
        raise HTTPException(status_code=409, detail="דוח עם כותרת זו כבר קיים")
    return database.update_report(report_id, **cleaned)


RATING_SUMMARY_COLUMNS = [
    {"key": "code", "label": "קוד"},
    {"key": "subject", "label": "נושא"},
    {"key": "model", "label": "מודל"},
    {"key": "team", "label": "צוות"},
    {"key": "status", "label": "סטטוס"},
    {"key": "computed_rating", "label": "דירוג מחושב"},
    {"key": "final_rating", "label": "דירוג סופי"},
]

RATING_EXPIRY_COLUMNS = [
    {"key": "code", "label": "קוד"},
    {"key": "subject", "label": "נושא"},
    {"key": "model", "label": "מודל"},
    {"key": "valid_until", "label": "תוקף עד"},
    {"key": "days_left", "label": "ימים לפקיעה"},
    {"key": "urgency", "label": "דחיפות"},
]


ENTITY_SELECT_REPORT_TYPES = ("rating_detail", "rating_comparison")


@app.get("/api/reports/{report_id}/preview")
def preview_report(
    report_id: str,
    kind: Optional[str] = None,
    entity_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    report = database.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="דוח לא נמצא")
    if report["report_type"] in ENTITY_SELECT_REPORT_TYPES:
        if not kind or not entity_id:
            return {"type": "entity_select"}
        if kind not in ("מנפיק", "נכס"):
            raise HTTPException(status_code=422, detail="סוג ישות לא תקין")
        detail = database.get_entity_rating_detail(kind, entity_id, date_from, date_to)
        if not detail:
            raise HTTPException(status_code=404, detail="הישות לא נמצאה")
        preview_type = "entity_detail" if report["report_type"] == "rating_detail" else "entity_comparison"
        return {"type": preview_type, **detail}
    if report["report_type"] == "rating_summary":
        return {"type": "table", "columns": RATING_SUMMARY_COLUMNS, "rows": database.get_rating_summary_rows()}
    if report["report_type"] == "rating_expiry":
        return {"type": "table", "columns": RATING_EXPIRY_COLUMNS, "rows": database.get_rating_expiry_rows()}
    if report["report_type"] == "rating_distribution":
        return {"type": "distribution", **database.get_rating_distribution()}
    return {"type": "spec", "purpose": report["purpose"], "content": report["content"]}


@app.get("/api/reports/{report_id}/export.csv")
def export_report_csv(
    report_id: str,
    kind: Optional[str] = None,
    entity_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    report = database.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="דוח לא נמצא")

    buffer = io.StringIO()
    buffer.write("﻿")  # BOM so Excel opens the UTF-8 Hebrew text correctly
    writer = csv.writer(buffer)

    if report["report_type"] in ENTITY_SELECT_REPORT_TYPES:
        if not kind or not entity_id:
            raise HTTPException(status_code=422, detail="יש לבחור מנפיק או נכס")
        detail = database.get_entity_rating_detail(kind, entity_id, date_from, date_to)
        if not detail:
            raise HTTPException(status_code=404, detail="הישות לא נמצאה")
        writer.writerow(["סוג ישות", kind])
        writer.writerow(["ישות", detail["entity"]["name"]])
        writer.writerow([])
        writer.writerow(
            ["קוד", "נושא", "מודל", "צוות", "סטטוס", "ציון מחושב", "דירוג מחושב", "ציון סופי", "דירוג סופי", "תוקף מ-", "תוקף עד"]
        )
        for r in detail["rankings"]:
            writer.writerow(
                [
                    r["code"], r["subject"], r["model"], r["team"], r["status"],
                    r["computed_score"], r["computed_rating"], r["final_score"], r["final_rating"],
                    r["valid_from"], r["valid_until"],
                ]
            )
    elif report["report_type"] == "rating_summary":
        writer.writerow([c["label"] for c in RATING_SUMMARY_COLUMNS])
        for row in database.get_rating_summary_rows():
            writer.writerow([row[c["key"]] for c in RATING_SUMMARY_COLUMNS])
    elif report["report_type"] == "rating_expiry":
        writer.writerow([c["label"] for c in RATING_EXPIRY_COLUMNS])
        for row in database.get_rating_expiry_rows():
            writer.writerow([row[c["key"]] for c in RATING_EXPIRY_COLUMNS])
    elif report["report_type"] == "rating_distribution":
        dist = database.get_rating_distribution()
        writer.writerow(["דירוג", "כמות"])
        for label, count in dist["by_rating"].items():
            writer.writerow([label, count])
        writer.writerow([])
        writer.writerow(["מודל", "כמות"])
        for label, count in dist["by_model"].items():
            writer.writerow([label, count])
    else:
        writer.writerow(["שדה", "ערך"])
        writer.writerow(["קוד דוח", report["id"]])
        writer.writerow(["כותרת", report["title"]])
        writer.writerow(["מטרה", report["purpose"] or ""])
        writer.writerow(["תוכן", report["content"] or ""])

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{report_id}.csv"'},
    )
