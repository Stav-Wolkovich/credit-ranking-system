"""
SQLite data access for the Rankings table.

Columns are the same fields the report page already displays: id, status,
tone (badge color), model, team, framework, kind, code, subject.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "rankings.db"

SEED_ROWS = [
    {"id": "RP-2026-00031", "status": "בתהליך", "tone": "blue", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00030", "status": "טיוטה", "tone": "gray", "model": "תחנות כוח v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00025", "status": "אושר בוועדה", "tone": "green", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "TEST", "kind": "נכס", "code": "LOAN-33957", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00024", "status": "בתהליך", "tone": "blue", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "נכס", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding"},
    {"id": "RP-2026-00023", "status": "בוטל", "tone": "red", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "TEST1", "kind": "נכס", "code": "LOAN-23967", "subject": "Allianz Archimedes SUZIE INVESTMENT"},
    {"id": "RP-2026-00022", "status": "מושהה", "tone": "amber", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "טסט נופר", "kind": "נכס", "code": "LOAN-23486", "subject": "WALL STREET 60"},
    {"id": "RP-2026-00019", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "ברקת מימון פרויקט שמגר", "kind": "נכס", "code": "LOAN-23903", "subject": "ברקת מימון"},
    {"id": "RP-2026-00018", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "אחים עופר הלוואה - 01.06.21", "kind": "נכס", "code": "LOAN-9904", "subject": "אחים עופר ירושלים"},
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rankings (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            tone TEXT NOT NULL,
            model TEXT NOT NULL,
            team TEXT NOT NULL,
            framework TEXT NOT NULL,
            kind TEXT NOT NULL,
            code TEXT NOT NULL,
            subject TEXT NOT NULL
        )
        """
    )
    row_count = conn.execute("SELECT COUNT(*) FROM rankings").fetchone()[0]
    if row_count == 0:
        conn.executemany(
            """
            INSERT INTO rankings (id, status, tone, model, team, framework, kind, code, subject)
            VALUES (:id, :status, :tone, :model, :team, :framework, :kind, :code, :subject)
            """,
            SEED_ROWS,
        )
        conn.commit()
    conn.close()


def get_all_rankings():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM rankings ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_ranking(ranking_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM rankings WHERE id = ?", (ranking_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_ranking_status(ranking_id: str, status: str, tone: str | None):
    conn = get_connection()
    if tone:
        conn.execute(
            "UPDATE rankings SET status = ?, tone = ? WHERE id = ?",
            (status, tone, ranking_id),
        )
    else:
        conn.execute(
            "UPDATE rankings SET status = ? WHERE id = ?",
            (status, ranking_id),
        )
    conn.commit()
    conn.close()
    return get_ranking(ranking_id)


def count_rankings():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM rankings").fetchone()[0]
    conn.close()
    return count


def count_rankings_by_status(status: str):
    conn = get_connection()
    count = conn.execute(
        "SELECT COUNT(*) FROM rankings WHERE status = ?", (status,)
    ).fetchone()[0]
    conn.close()
    return count
