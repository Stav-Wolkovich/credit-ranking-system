"""
Backend for the internal ranking (דירוג פנימי) back-office application.

Ranking data is persisted in SQLite (see database.py) rather than kept
in-memory, so it survives restarts and can be queried/updated like a real
data store.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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


def compute_summary():
    return {
        "expiring_in_60_days": 1,
        "awaiting_approval": 1,
        "in_progress": database.count_rankings_by_status("בתהליך"),
        "active_processes": 21,
        "total_processes": database.count_rankings() * 3,  # placeholder metric, matches "24 processes" in the mock
        "last_updated": date.today().isoformat(),
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StatusUpdate(BaseModel):
    status: str
    tone: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/nav")
def get_nav():
    return [
        {**item, "count": database.count_rankings()} if item["id"] == "report" else item
        for item in NAV_ITEMS
    ]


@app.get("/api/report")
def get_report():
    """Everything the main ranking-report page needs in one call."""
    return {
        "summary": compute_summary(),
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
