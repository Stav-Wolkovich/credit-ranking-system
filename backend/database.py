"""
SQLite data access for the Rankings and Ranking Processes tables.

Rankings columns are the fields the report page displays: id, status,
tone (badge color), model, team, framework, kind, code, subject.

Ranking Processes columns are the fields the processes page displays: id,
subject, code, framework, status, tone, final_score, final_rating,
completion.

Issuers columns are the fields the issuers page displays: id (issuer
code), name, type, sector, country, active.
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

SEED_PROCESS_ROWS = [
    {"id": "RP-2026-00031", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "בתהליך", "tone": "blue", "final_score": 1.00, "final_rating": "AAA", "completion": 0},
    {"id": "RP-2026-00030", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "completion": 0},
    {"id": "RP-2026-00025", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-33957", "framework": "TEST", "status": "אושר בוועדה", "tone": "green", "final_score": 3.28, "final_rating": "AA", "completion": 0},
    {"id": "RP-2026-00024", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "בתהליך", "tone": "blue", "final_score": None, "final_rating": None, "completion": 0},
    {"id": "RP-2026-00023", "subject": "Allianz Archimedes SUZIE INVESTMENT", "code": "LOAN-23967", "framework": "TEST1", "status": "בוטל", "tone": "red", "final_score": None, "final_rating": None, "completion": 0},
    {"id": "RP-2026-00022", "subject": "WALL STREET 60", "code": "LOAN-23486", "framework": "טסט נופר", "status": "מושהה", "tone": "amber", "final_score": None, "final_rating": None, "completion": 0},
    {"id": "RP-2026-00019", "subject": "ברקת מימון", "code": "LOAN-23903", "framework": "ברקת מימון פרויקט שמגר", "status": "בתוקף", "tone": "green", "final_score": 7.00, "final_rating": "A-", "completion": 0},
    {"id": "RP-2026-00018", "subject": "אחים עופר ירושלים", "code": "LOAN-9904", "framework": "אחים עופר הלוואה - 01.06.21", "status": "בתוקף", "tone": "green", "final_score": 6.00, "final_rating": "A", "completion": 0},
    {"id": "RP-2026-00017", "subject": "-", "code": "-", "framework": "-", "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "completion": 0},
    {"id": "RP-2026-00016", "subject": "בנק הפועלים", "code": "POLI-IL", "framework": "-", "status": "פיקטיבי", "tone": "amber", "final_score": None, "final_rating": None, "completion": 0},
]

SEED_ISSUER_ROWS = [
    {"id": "10000364", "name": "WALL STREET 60", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000399", "name": "Allianz Archimedes SUZIE INVESTMENT", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000479", "name": "Allianz – Centinela", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000365", "name": "Allianz euNetworks Holdings Limited", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000484", "name": "Allianz - Financiere Vendome II Diam Coc (EPC 3)", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000366", "name": "Allianz - Porterbrook Ulfstead Midco Limited", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000367", "name": "Allianz - project hercules", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000368", "name": "Allianz - Project Runde", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000530", "name": "Allianz - Rotera TRENDBELL DESIGNATED ACTIVITY COMPANY", "type": None, "sector": None, "country": None, "active": False},
    {"id": "10000497", "name": "Allianz (EPC 3) – Mehler", "type": None, "sector": None, "country": None, "active": False},
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

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ranking_processes (
            id TEXT PRIMARY KEY,
            subject TEXT NOT NULL,
            code TEXT NOT NULL,
            framework TEXT NOT NULL,
            status TEXT NOT NULL,
            tone TEXT NOT NULL,
            final_score REAL,
            final_rating TEXT,
            completion INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    process_count = conn.execute("SELECT COUNT(*) FROM ranking_processes").fetchone()[0]
    if process_count == 0:
        conn.executemany(
            """
            INSERT INTO ranking_processes
                (id, subject, code, framework, status, tone, final_score, final_rating, completion)
            VALUES
                (:id, :subject, :code, :framework, :status, :tone, :final_score, :final_rating, :completion)
            """,
            SEED_PROCESS_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS issuers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            sector TEXT,
            country TEXT,
            active INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    issuer_count = conn.execute("SELECT COUNT(*) FROM issuers").fetchone()[0]
    if issuer_count == 0:
        conn.executemany(
            """
            INSERT INTO issuers (id, name, type, sector, country, active)
            VALUES (:id, :name, :type, :sector, :country, :active)
            """,
            SEED_ISSUER_ROWS,
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


def get_all_processes():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM ranking_processes ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def count_processes():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM ranking_processes").fetchone()[0]
    conn.close()
    return count


def get_all_issuers():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM issuers ORDER BY rowid ASC").fetchall()
    conn.close()
    return [{**dict(row), "active": bool(row["active"])} for row in rows]


def count_issuers():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM issuers").fetchone()[0]
    conn.close()
    return count


def get_issuer(issuer_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM issuers WHERE id = ?", (issuer_id,)).fetchone()
    conn.close()
    return {**dict(row), "active": bool(row["active"])} if row else None


def issuer_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM issuers WHERE id = ? AND id != ?", (code, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM issuers WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def issuer_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM issuers WHERE name = ? AND id != ?", (name, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM issuers WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def create_issuer(id: str, name: str, type: str | None, sector: str | None, country: str | None):
    conn = get_connection()
    conn.execute(
        "INSERT INTO issuers (id, name, type, sector, country, active) VALUES (?, ?, ?, ?, ?, 0)",
        (id, name, type, sector, country),
    )
    conn.commit()
    conn.close()
    return get_issuer(id)


def update_issuer(
    original_id: str, id: str, name: str, type: str | None, sector: str | None, country: str | None
):
    conn = get_connection()
    conn.execute(
        "UPDATE issuers SET id = ?, name = ?, type = ?, sector = ?, country = ? WHERE id = ?",
        (id, name, type, sector, country, original_id),
    )
    conn.commit()
    conn.close()
    return get_issuer(id)
