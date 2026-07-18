"""
Backend for the internal ranking (דירוג פנימי) back-office application.

For now, data lives in-memory so the app is easy to run without a database.
Swap `DB` for a real connection (Postgres, etc.) later — the route handlers
below are already the shape you'd want: thin, and returning plain dicts.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date

app = FastAPI(title="Internal Ranking API", version="0.1.0")

# Dev CORS: the Vite dev server runs on a different port than the API.
# Tighten this to your real frontend origin(s) before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# "Database" — in-memory for now
# ---------------------------------------------------------------------------

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

RANKING_ROWS = [
    {"id": "RP-2026-00031", "status": "בתהליך", "tone": "blue", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00030", "status": "טיוטה", "tone": "gray", "model": "תחנות כוח v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00025", "status": "אושר בוועדה", "tone": "green", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "TEST", "kind": "נכס", "code": "LOAN-33957", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00024", "status": "בתהליך", "tone": "blue", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "נכס", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00023", "status": "בוטל", "tone": "red", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "TEST1", "kind": "נכס", "code": "LOAN-23967", "subject": "Allianz Archimedes SUZIE INVESTMENT"},
    {"id": "RP-2026-00022", "status": "מושהה", "tone": "amber", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "טסט נופר", "kind": "נכס", "code": "LOAN-23486", "subject": "WALL STREET 60"},
    {"id": "RP-2026-00019", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "ברקת מימון פרויקט שמגר", "kind": "נכס", "code": "LOAN-23903", "subject": "ברקת מימון"},
    {"id": "RP-2026-00018", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "אחים עופר הלוואה - 01.06.21", "kind": "נכס", "code": "LOAN-9904", "subject": "אחים עופר ירושלים"},
]


def compute_summary():
    return {
        "expiring_in_60_days": 1,
        "awaiting_approval": 1,
        "in_progress": sum(1 for r in RANKING_ROWS if r["status"] == "בתהליך"),
        "active_processes": 21,
        "total_processes": len(RANKING_ROWS) * 3,  # placeholder metric, matches "24 processes" in the mock
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
        {**item, "count": len(RANKING_ROWS)} if item["id"] == "report" else item
        for item in NAV_ITEMS
    ]


@app.get("/api/report")
def get_report():
    """Everything the main ranking-report page needs in one call."""
    return {
        "summary": compute_summary(),
        "rows": RANKING_ROWS,
    }


@app.get("/api/report/rows/{process_id}")
def get_row(process_id: str):
    row = next((r for r in RANKING_ROWS if r["id"] == process_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    return row


@app.patch("/api/report/rows/{process_id}/status")
def update_status(process_id: str, update: StatusUpdate):
    row = next((r for r in RANKING_ROWS if r["id"] == process_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    row["status"] = update.status
    if update.tone:
        row["tone"] = update.tone
    return row
