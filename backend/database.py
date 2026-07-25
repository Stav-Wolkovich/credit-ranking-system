"""
SQLite data access for the Rankings and Ranking Processes tables.

Rankings columns are the fields the report page displays: id, status,
tone (badge color), model, team, framework, kind, code, subject,
approval_date (set once a ranking reaches "בתוקף"; used to flag
rankings expiring within 60 days — i.e. approved 10+ months ago).
get_all_rankings() additionally joins in final_score, final_rating,
computed_score, computed_rating, and completion from the matching
ranking_processes row (same id — a ranking and its process are the
same תהליך, just displayed on two different pages), plus a
valid_from/valid_until window derived from approval_date.

Canonical ranking statuses: טיוטה, בעבודה, ממתין לאישור, הוחזר, מאושר,
ממתין לוועדה, אושר ועדה, בתוקף, פג תוקף — plus the legacy בוטל/מושהה
still used by a couple of seed rows.

Ranking Processes columns are the fields the processes page displays: id,
subject, code, framework, status, tone, final_score, final_rating,
computed_score, computed_rating, completion. computed_* is the model's
raw output; final_* is what was actually approved (a committee can
approve a different rating than the one computed).

Issuers columns are the fields the issuers page displays: id (issuer
code), name, type, sector, country, active.

Models columns are the fields the models page displays: id (model
code), name, family, domain, owner, active_version, versions_count,
segments_count, questionnaires_count, status, tone, last_updated,
description. questionnaires_count is computed from the
model_questionnaires join table rather than stored.

Questionnaires columns are the fields the questionnaires page displays:
id (code), name, calculation_method, type (מערכת/מותאם), status, tone,
version, description, created_date, created_by. model_questionnaires
links a model to the questionnaires assigned to it (model_id,
questionnaire_id).

questionnaire_parameters holds the scoring parameters that make up a
questionnaire (questionnaire_id, name, type, weight, position).
parameter_answers holds the ranked answer options for a parameter
(parameter_id, text, position).

Users columns are the fields the users page displays: id (username),
full_name, email, active. user_roles links a user to the roles
assigned to them (user_id, role_id). Roles columns are: id (code,
e.g. RISK_MODEL_BUILDER), description.

Matrices columns are the fields the matrices page displays: id (matrix
code), name, type (e.g. רשת 2D), model_id (the model the matrix belongs
to), axes, cells. get_all_matrices()/get_matrix() additionally join in
model_name from the matching models row.
"""
import sqlite3
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).parent / "rankings.db"

SEED_ROWS = [
    {"id": "RP-2026-00031", "status": "ממתין לאישור", "tone": "amber", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding", "approval_date": None},
    {"id": "RP-2026-00030", "status": "טיוטה", "tone": "gray", "model": "תחנות כוח v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "מנפיק", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding", "approval_date": None},
    {"id": "RP-2026-00025", "status": "אושר ועדה", "tone": "green", "model": "תאגידים ישראל v2", "team": "צוות השקעות", "framework": "TEST", "kind": "נכס", "code": "LOAN-33957", "subject": "חשבון מנוהל - Fuse Funding", "approval_date": "2026-06-01"},
    {"id": "RP-2026-00024", "status": "בעבודה", "tone": "blue", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "Real Estate Development LOAN A, LLC 1002", "kind": "נכס", "code": "LOAN-34285", "subject": "חשבון מנוהל - Fuse Funding", "approval_date": None},
    {"id": "RP-2026-00023", "status": "בוטל", "tone": "red", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "TEST1", "kind": "נכס", "code": "LOAN-23967", "subject": "Allianz Archimedes SUZIE INVESTMENT", "approval_date": None},
    {"id": "RP-2026-00022", "status": "מושהה", "tone": "amber", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "טסט נופר", "kind": "נכס", "code": "LOAN-23486", "subject": "WALL STREET 60", "approval_date": None},
    {"id": "RP-2026-00019", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "ברקת מימון פרויקט שמגר", "kind": "נכס", "code": "LOAN-23903", "subject": "ברקת מימון", "approval_date": "2025-08-15"},
    {"id": "RP-2026-00018", "status": "בתוקף", "tone": "green", "model": "דירוג פרויקט נדל\"ן יזמי v1", "team": "צוות השקעות", "framework": "אחים עופר הלוואה - 01.06.21", "kind": "נכס", "code": "LOAN-9904", "subject": "אחים עופר ירושלים", "approval_date": "2026-05-10"},
]

SEED_PROCESS_ROWS = [
    {"id": "RP-2026-00031", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "בתהליך", "tone": "blue", "final_score": 1.00, "final_rating": "AAA", "computed_score": 1.00, "computed_rating": "AAA", "completion": 0},
    {"id": "RP-2026-00030", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00025", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-33957", "framework": "TEST", "status": "אושר בוועדה", "tone": "green", "final_score": 3.28, "final_rating": "AA", "computed_score": 3.28, "computed_rating": "AA", "completion": 0},
    {"id": "RP-2026-00024", "subject": "חשבון מנוהל - Fuse Funding", "code": "LOAN-34285", "framework": "Real Estate Development LOAN A, LLC 1002", "status": "בתהליך", "tone": "blue", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00023", "subject": "Allianz Archimedes SUZIE INVESTMENT", "code": "LOAN-23967", "framework": "TEST1", "status": "בוטל", "tone": "red", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00022", "subject": "WALL STREET 60", "code": "LOAN-23486", "framework": "טסט נופר", "status": "מושהה", "tone": "amber", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00019", "subject": "ברקת מימון", "code": "LOAN-23903", "framework": "ברקת מימון פרויקט שמגר", "status": "בתוקף", "tone": "green", "final_score": 7.00, "final_rating": "A-", "computed_score": 5.26, "computed_rating": "A+", "completion": 0},
    {"id": "RP-2026-00018", "subject": "אחים עופר ירושלים", "code": "LOAN-9904", "framework": "אחים עופר הלוואה - 01.06.21", "status": "בתוקף", "tone": "green", "final_score": 6.00, "final_rating": "A", "computed_score": 3.07, "computed_rating": "AA", "completion": 0},
    {"id": "RP-2026-00017", "subject": "-", "code": "-", "framework": "-", "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00016", "subject": "בנק הפועלים", "code": "POLI-IL", "framework": "-", "status": "פיקטיבי", "tone": "amber", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
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

SEED_MODEL_ROWS = [
    {"id": "CORP-IL", "name": "תאגידים ישראל", "family": "תאגידים", "domain": "Corporate", "owner": "נופר טורגמן", "active_version": "v2", "versions_count": 2, "segments_count": 1, "questionnaires_count": 2, "status": "פעיל", "tone": "green", "last_updated": "15/03/2026"},
    {"id": "PROJ-FIN", "name": "מימון פרויקטים", "family": "מימון פרויקטים", "domain": "Project Finance", "owner": "דוד שלום", "active_version": "v1", "versions_count": 1, "segments_count": 0, "questionnaires_count": 0, "status": "פעיל", "tone": "green", "last_updated": "10/04/2026"},
    {"id": "REAL-EST", "name": "תחנות כוח", "family": "מימון פרויקטים", "domain": "Project Finance", "owner": "נופר טורגמן", "active_version": "v1", "versions_count": 2, "segments_count": 1, "questionnaires_count": 0, "status": "פעיל", "tone": "green", "last_updated": "09/07/2026"},
    {"id": "RE-PROJ", "name": "דירוג פרויקט נדל\"ן יזמי", "family": "נדל\"ן יזמי", "domain": "Real Estate Project", "owner": "נופר טורגמן", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "פעיל", "tone": "green", "last_updated": "23/06/2026"},
    {"id": "TEST-NOFAR", "name": "test1", "family": "test", "domain": "Corporate", "owner": "נופר טורגמן", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "טיוטה", "tone": "gray", "last_updated": "09/07/2026"},
    {"id": "TEST-NOFAR1", "name": "test2", "family": "test", "domain": "Corporate", "owner": "נופר טורגמן", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "טיוטה", "tone": "gray", "last_updated": "06/07/2026"},
]

SEED_QUESTIONNAIRE_ROWS = [
    {"id": "SECTOR-BIZ-POS", "name": "מיצוב עיסקי", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v6", "description": None, "created_date": "01/03/2024", "created_by": "נופר טורגמן"},
    {"id": "SECTOR-IND-RATE", "name": "דירוג הענף בו פועלת החברה", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v6", "description": None, "created_date": "01/03/2024", "created_by": "נופר טורגמן"},
    {"id": "PP-WEIGHTED", "name": "תחנות כוח - משתנים משוקללים", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v9", "description": None, "created_date": "15/06/2024", "created_by": "נופר טורגמן"},
    {"id": "PP-ADJUSTMENTS", "name": "תחנות כוח - התאמות דירוג", "calculation_method": "סכום", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v25", "description": None, "created_date": "15/06/2024", "created_by": "נופר טורגמן"},
    {"id": "RE-PROJ-WEIGHTED", "name": "דירוג פרויקט נדל\"ן יזמי - משתנים משוקללים", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "15/06/2024", "created_by": "נופר טורגמן"},
    {"id": "RE-PROJ-ADJUST", "name": "דירוג פרויקט נדל\"ן יזמי - התאמות דירוג", "calculation_method": "סכום", "type": "מערכת", "status": "פעיל", "tone": "green", "version": "v1", "description": None, "created_date": "15/06/2024", "created_by": "נופר טורגמן"},
    {"id": "TEST", "name": "טסט", "calculation_method": "מקסימום", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "06/07/2026", "created_by": "נופר טורגמן"},
    {"id": "T1", "name": "test1", "calculation_method": "סכום", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "06/07/2026", "created_by": "נופר טורגמן"},
    {"id": "RE-PROJ-MACRO", "name": "סיכוני מקרו פרויקט נדל\"ן יזמי", "calculation_method": "ממוצע משוקלל", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v1", "description": None, "created_date": "09/07/2026", "created_by": "נופר טורגמן"},
]

SEED_PARAMETER_ROWS = [
    {"name": "נתח שוק", "type": "סובייקטיבי", "weight": 25},
    {"name": "השפעה על מחירי שוק", "type": "סובייקטיבי", "weight": 25},
    {"name": "כח מיקוח מול ספקים", "type": "סובייקטיבי", "weight": 25},
    {"name": "מיקום החברה בענף", "type": "סובייקטיבי", "weight": 25},
]

SEED_ANSWER_TEXTS = [
    "חברה מובילה עם נתח שוק משמעותי",
    "מהותי",
    "מעל המחוצע הענפי",
    "ממוצע בענף",
    "מעט מתחת למחוצע בענף",
    "מתחת לממוצע",
    "הרבה מתחת למחוצע בענף",
    "יחסים פיננסים ונתח שוק הרבה מתחת לממוצע",
    "יחסים פיננסים חלשים מאד נתח שוק זניח",
]

SEED_ROLE_ROWS = [
    {"id": "RISK_MODEL_BUILDER", "description": None},
    {"id": "META_DATA_ADMIN", "description": None},
    {"id": "RATING_ANALYST", "description": None},
]

SEED_USER_ROWS = [
    {"id": "nofar.torgeman", "full_name": "נופר טורגמן", "email": None, "active": True},
    {"id": "david.shalom", "full_name": "דוד שלום", "email": None, "active": True},
    {"id": "sarah.mizrahi", "full_name": "שרה מזרחי", "email": None, "active": True},
    {"id": "revital.wolkovich", "full_name": "רוית וולקוביץ", "email": None, "active": True},
]

SEED_USER_ROLE_LINKS = [
    ("nofar.torgeman", "RISK_MODEL_BUILDER"),
    ("nofar.torgeman", "RATING_ANALYST"),
    ("david.shalom", "RISK_MODEL_BUILDER"),
    ("david.shalom", "RATING_ANALYST"),
    ("sarah.mizrahi", "META_DATA_ADMIN"),
]

SEED_MATRIX_ROWS = [
    {"id": "BUDGET-MATRIX", "name": "מטריצת תקציב – סטיית הכנסות מול סטיית עלויות", "type": "רשת 2D", "model_id": "RE-PROJ", "axes": 2, "cells": 81},
    {"id": "SALES-EXEC-MATRIX", "name": "מטריצת מכירות (השכרות) מול ביצוע", "type": "רשת 2D", "model_id": "RE-PROJ", "axes": 2, "cells": 121},
    {"id": "COUNTRY-RISK-MATRIX", "name": "מטריצת סיכון מדינה – השפעה גבוהה", "type": "רשת 2D", "model_id": "RE-PROJ", "axes": 2, "cells": 324},
    {"id": "TEST", "name": "טסט", "type": "רשת 2D", "model_id": "PROJ-FIN", "axes": 2, "cells": 1},
    {"id": "TEST2", "name": "test 2", "type": "רשת 2D", "model_id": "RE-PROJ", "axes": 2, "cells": 4},
    {"id": "TEST-3", "name": "TEST", "type": "רשת 2D", "model_id": "PROJ-FIN", "axes": 2, "cells": 24},
    {"id": "TEST-CLONE", "name": "שכפול", "type": "רשת 2D", "model_id": "PROJ-FIN", "axes": 2, "cells": 20},
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
            subject TEXT NOT NULL,
            approval_date TEXT
        )
        """
    )
    rankings_columns = {row["name"] for row in conn.execute("PRAGMA table_info(rankings)").fetchall()}
    if "approval_date" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN approval_date TEXT")
    row_count = conn.execute("SELECT COUNT(*) FROM rankings").fetchone()[0]
    if row_count == 0:
        conn.executemany(
            """
            INSERT INTO rankings (id, status, tone, model, team, framework, kind, code, subject, approval_date)
            VALUES (:id, :status, :tone, :model, :team, :framework, :kind, :code, :subject, :approval_date)
            """,
            SEED_ROWS,
        )
        conn.commit()
    else:
        # Backfill rows created before the canonical status set / approval_date
        # existed. Only touches rows still on their old status string, so any
        # real status change made since (via the PATCH endpoint) is preserved.
        old_statuses = {"בתהליך", "אושר בוועדה"}
        for seed in SEED_ROWS:
            row = conn.execute(
                "SELECT status, approval_date FROM rankings WHERE id = ?", (seed["id"],)
            ).fetchone()
            if row is None:
                continue
            if row["status"] in old_statuses and row["status"] != seed["status"]:
                conn.execute(
                    "UPDATE rankings SET status = ?, tone = ? WHERE id = ?",
                    (seed["status"], seed["tone"], seed["id"]),
                )
            if row["approval_date"] is None and seed["approval_date"] is not None:
                conn.execute(
                    "UPDATE rankings SET approval_date = ? WHERE id = ?",
                    (seed["approval_date"], seed["id"]),
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
            computed_score REAL,
            computed_rating TEXT,
            completion INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    process_columns = {row["name"] for row in conn.execute("PRAGMA table_info(ranking_processes)").fetchall()}
    for column in ("computed_score", "computed_rating"):
        if column not in process_columns:
            ddl_type = "REAL" if column == "computed_score" else "TEXT"
            conn.execute(f"ALTER TABLE ranking_processes ADD COLUMN {column} {ddl_type}")
    process_count = conn.execute("SELECT COUNT(*) FROM ranking_processes").fetchone()[0]
    if process_count == 0:
        conn.executemany(
            """
            INSERT INTO ranking_processes
                (id, subject, code, framework, status, tone, final_score, final_rating,
                 computed_score, computed_rating, completion)
            VALUES
                (:id, :subject, :code, :framework, :status, :tone, :final_score, :final_rating,
                 :computed_score, :computed_rating, :completion)
            """,
            SEED_PROCESS_ROWS,
        )
        conn.commit()
    else:
        # Backfill computed_score/computed_rating for rows created before
        # these columns existed, without clobbering any later real edit.
        for seed in SEED_PROCESS_ROWS:
            conn.execute(
                """
                UPDATE ranking_processes SET computed_score = :computed_score, computed_rating = :computed_rating
                WHERE id = :id AND computed_score IS NULL AND computed_rating IS NULL AND final_score IS NOT NULL
                """,
                seed,
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

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            family TEXT NOT NULL,
            domain TEXT NOT NULL,
            owner TEXT NOT NULL,
            active_version TEXT NOT NULL,
            versions_count INTEGER NOT NULL DEFAULT 1,
            segments_count INTEGER NOT NULL DEFAULT 0,
            questionnaires_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            tone TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            description TEXT
        )
        """
    )
    model_columns = {row["name"] for row in conn.execute("PRAGMA table_info(models)").fetchall()}
    if "description" not in model_columns:
        conn.execute("ALTER TABLE models ADD COLUMN description TEXT")
    model_count = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
    if model_count == 0:
        conn.executemany(
            """
            INSERT INTO models
                (id, name, family, domain, owner, active_version, versions_count,
                 segments_count, questionnaires_count, status, tone, last_updated)
            VALUES
                (:id, :name, :family, :domain, :owner, :active_version, :versions_count,
                 :segments_count, :questionnaires_count, :status, :tone, :last_updated)
            """,
            SEED_MODEL_ROWS,
        )
        conn.commit()

    # The original schema had `description TEXT NOT NULL`. SQLite can't relax a
    # NOT NULL constraint via ALTER TABLE, so if that's still in place, rebuild
    # the table (preserving existing rows) before applying the current schema.
    desc_col = next(
        (
            r
            for r in conn.execute("PRAGMA table_info(questionnaires)").fetchall()
            if r["name"] == "description"
        ),
        None,
    )
    if desc_col is not None and desc_col["notnull"]:
        conn.execute("ALTER TABLE questionnaires RENAME TO questionnaires_old")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS questionnaires (
            id TEXT PRIMARY KEY,
            name TEXT,
            calculation_method TEXT,
            type TEXT,
            status TEXT,
            tone TEXT,
            version TEXT,
            description TEXT,
            created_date TEXT,
            created_by TEXT
        )
        """
    )
    if desc_col is not None and desc_col["notnull"]:
        conn.execute("INSERT INTO questionnaires (id, description) SELECT id, description FROM questionnaires_old")
        conn.execute("DROP TABLE questionnaires_old")

    for seed in SEED_QUESTIONNAIRE_ROWS:
        existing = conn.execute(
            "SELECT name FROM questionnaires WHERE id = ?", (seed["id"],)
        ).fetchone()
        if existing is None:
            conn.execute(
                """
                INSERT INTO questionnaires
                    (id, name, calculation_method, type, status, tone, version, description, created_date, created_by)
                VALUES
                    (:id, :name, :calculation_method, :type, :status, :tone, :version, :description, :created_date, :created_by)
                """,
                seed,
            )
        elif existing["name"] is None:
            # pre-existing row from before these columns were added — backfill it.
            # description used to double as the row's label; reset it to the
            # seed's real (empty) description now that `name` covers that.
            conn.execute(
                """
                UPDATE questionnaires
                SET name = :name, calculation_method = :calculation_method, type = :type,
                    status = :status, tone = :tone, version = :version,
                    description = :description, created_date = :created_date, created_by = :created_by
                WHERE id = :id
                """,
                seed,
            )
    conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS questionnaire_parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            weight INTEGER NOT NULL DEFAULT 0,
            position INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS parameter_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parameter_id INTEGER NOT NULL REFERENCES questionnaire_parameters(id),
            text TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    parameter_count = conn.execute("SELECT COUNT(*) FROM questionnaire_parameters").fetchone()[0]
    if parameter_count == 0:
        for position, param in enumerate(SEED_PARAMETER_ROWS, start=1):
            cur = conn.execute(
                "INSERT INTO questionnaire_parameters (questionnaire_id, name, type, weight, position) VALUES (?, ?, ?, ?, ?)",
                ("SECTOR-BIZ-POS", param["name"], param["type"], param["weight"], position),
            )
            if position == 1:
                param_id = cur.lastrowid
                conn.executemany(
                    "INSERT INTO parameter_answers (parameter_id, text, position) VALUES (?, ?, ?)",
                    [(param_id, text, i) for i, text in enumerate(SEED_ANSWER_TEXTS, start=1)],
                )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS model_questionnaires (
            model_id TEXT NOT NULL REFERENCES models(id),
            questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
            PRIMARY KEY (model_id, questionnaire_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            description TEXT
        )
        """
    )
    role_count = conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    if role_count == 0:
        conn.executemany(
            "INSERT INTO roles (id, description) VALUES (:id, :description)", SEED_ROLE_ROWS
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if user_count == 0:
        conn.executemany(
            """
            INSERT INTO users (id, full_name, email, active)
            VALUES (:id, :full_name, :email, :active)
            """,
            SEED_USER_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id TEXT NOT NULL REFERENCES users(id),
            role_id TEXT NOT NULL REFERENCES roles(id),
            PRIMARY KEY (user_id, role_id)
        )
        """
    )
    user_role_count = conn.execute("SELECT COUNT(*) FROM user_roles").fetchone()[0]
    if user_role_count == 0:
        conn.executemany(
            "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", SEED_USER_ROLE_LINKS
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS matrices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            model_id TEXT NOT NULL REFERENCES models(id),
            axes INTEGER NOT NULL DEFAULT 2,
            cells INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    matrix_count = conn.execute("SELECT COUNT(*) FROM matrices").fetchone()[0]
    if matrix_count == 0:
        conn.executemany(
            """
            INSERT INTO matrices (id, name, type, model_id, axes, cells)
            VALUES (:id, :name, :type, :model_id, :axes, :cells)
            """,
            SEED_MATRIX_ROWS,
        )
        conn.commit()

    conn.commit()
    conn.close()


def _add_one_year(d):
    try:
        return d.replace(year=d.year + 1)
    except ValueError:
        # Feb 29 on a source date with no Feb 29 the following year
        return d.replace(year=d.year + 1, day=28)


def get_all_rankings():
    """Rankings joined with their matching תהליכי דירוג row (same id) for the
    score/rating/completion columns, plus a validity window derived from
    approval_date for בתוקף rankings."""
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM rankings ORDER BY id DESC").fetchall()]
    process_rows = conn.execute(
        "SELECT id, final_score, final_rating, computed_score, computed_rating, completion FROM ranking_processes"
    ).fetchall()
    conn.close()

    process_by_id = {p["id"]: dict(p) for p in process_rows}
    for row in rows:
        proc = process_by_id.get(row["id"])
        row["final_score"] = proc["final_score"] if proc else None
        row["final_rating"] = proc["final_rating"] if proc else None
        row["computed_score"] = proc["computed_score"] if proc else None
        row["computed_rating"] = proc["computed_rating"] if proc else None
        row["completion"] = proc["completion"] if proc else 0

        row["data_date"] = None  # not sourced from anywhere yet
        if row["status"] == "בתוקף" and row["approval_date"]:
            valid_from = date.fromisoformat(row["approval_date"])
            valid_until = _add_one_year(valid_from)
            row["valid_from"] = valid_from.strftime("%d/%m/%Y")
            row["valid_until"] = valid_until.strftime("%d/%m/%Y")
        else:
            row["valid_from"] = None
            row["valid_until"] = None
    return rows


def get_rankings_by_status(status: str):
    return [row for row in get_all_rankings() if row["status"] == status]


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


def count_rankings_expiring_within(days: int = 60):
    """Rankings that are בתוקף and whose expiration (approval_date + 1 year)
    falls within the given number of days from today (or has already
    passed, which is still worth surfacing)."""
    today = date.today()
    conn = get_connection()
    rows = conn.execute(
        "SELECT approval_date FROM rankings WHERE status = 'בתוקף' AND approval_date IS NOT NULL"
    ).fetchall()
    conn.close()
    count = 0
    for row in rows:
        approved = date.fromisoformat(row["approval_date"])
        expiration = _add_one_year(approved)
        if (expiration - today).days <= days:
            count += 1
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


def delete_issuer(issuer_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM issuers WHERE id = ?", (issuer_id,))
    conn.commit()
    conn.close()


def _attach_questionnaire_ids(conn, models):
    links = conn.execute("SELECT model_id, questionnaire_id FROM model_questionnaires").fetchall()
    ids_by_model = {}
    for link in links:
        ids_by_model.setdefault(link["model_id"], []).append(link["questionnaire_id"])
    for model in models:
        q_ids = ids_by_model.get(model["id"], [])
        model["questionnaire_ids"] = q_ids
        model["questionnaires_count"] = len(q_ids)
    return models


def get_all_models():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM models ORDER BY rowid ASC").fetchall()]
    _attach_questionnaire_ids(conn, rows)
    conn.close()
    return rows


def count_models():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
    conn.close()
    return count


def get_model(model_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
    if not row:
        conn.close()
        return None
    model = dict(row)
    _attach_questionnaire_ids(conn, [model])
    conn.close()
    return model


def model_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM models WHERE id = ? AND id != ?", (code, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM models WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def model_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM models WHERE name = ? AND id != ?", (name, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM models WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def create_model(
    id: str,
    name: str,
    family: str,
    domain: str,
    owner: str,
    last_updated: str,
    description: str | None = None,
    questionnaire_ids: list[str] | None = None,
):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO models
            (id, name, family, domain, owner, active_version, versions_count,
             segments_count, questionnaires_count, status, tone, last_updated, description)
        VALUES (?, ?, ?, ?, ?, 'v1', 1, 0, 0, 'טיוטה', 'gray', ?, ?)
        """,
        (id, name, family, domain, owner, last_updated, description),
    )
    _replace_model_questionnaires(conn, id, questionnaire_ids or [])
    conn.commit()
    conn.close()
    return get_model(id)


def update_model(
    original_id: str,
    id: str,
    name: str,
    family: str,
    domain: str,
    owner: str,
    last_updated: str,
    description: str | None = None,
    questionnaire_ids: list[str] | None = None,
):
    conn = get_connection()
    conn.execute(
        """
        UPDATE models SET id = ?, name = ?, family = ?, domain = ?, owner = ?, last_updated = ?, description = ?
        WHERE id = ?
        """,
        (id, name, family, domain, owner, last_updated, description, original_id),
    )
    if original_id != id:
        conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (original_id,))
    if questionnaire_ids is not None:
        _replace_model_questionnaires(conn, id, questionnaire_ids)
    conn.commit()
    conn.close()
    return get_model(id)


def delete_model(model_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (model_id,))
    conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()


def _replace_model_questionnaires(conn, model_id: str, questionnaire_ids: list[str]):
    conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (model_id,))
    if questionnaire_ids:
        conn.executemany(
            "INSERT INTO model_questionnaires (model_id, questionnaire_id) VALUES (?, ?)",
            [(model_id, q_id) for q_id in questionnaire_ids],
        )


def _questionnaire_parameter_counts(conn):
    rows = conn.execute(
        "SELECT questionnaire_id, COUNT(*) AS n FROM questionnaire_parameters GROUP BY questionnaire_id"
    ).fetchall()
    return {row["questionnaire_id"]: row["n"] for row in rows}


def get_all_questionnaires():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM questionnaires ORDER BY rowid ASC").fetchall()]
    counts = _questionnaire_parameter_counts(conn)
    for row in rows:
        row["parameters_count"] = counts.get(row["id"], 0)
    conn.close()
    return rows


def count_questionnaires():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM questionnaires").fetchone()[0]
    conn.close()
    return count


def _get_parameters_with_answers(conn, questionnaire_id: str):
    param_rows = conn.execute(
        "SELECT * FROM questionnaire_parameters WHERE questionnaire_id = ? ORDER BY position ASC",
        (questionnaire_id,),
    ).fetchall()
    parameters = []
    for p in param_rows:
        answer_rows = conn.execute(
            "SELECT text FROM parameter_answers WHERE parameter_id = ? ORDER BY position ASC",
            (p["id"],),
        ).fetchall()
        parameters.append(
            {
                "name": p["name"],
                "type": p["type"],
                "weight": p["weight"],
                "answers": [a["text"] for a in answer_rows],
            }
        )
    return parameters


def get_questionnaire(questionnaire_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM questionnaires WHERE id = ?", (questionnaire_id,)).fetchone()
    if not row:
        conn.close()
        return None
    questionnaire = dict(row)
    questionnaire["parameters"] = _get_parameters_with_answers(conn, questionnaire_id)
    questionnaire["parameters_count"] = len(questionnaire["parameters"])
    conn.close()
    return questionnaire


def questionnaire_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM questionnaires WHERE id = ? AND id != ?", (code, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM questionnaires WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def questionnaire_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM questionnaires WHERE name = ? AND id != ?", (name, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM questionnaires WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def _replace_questionnaire_parameters(conn, questionnaire_id: str, parameters: list[dict]):
    old_param_ids = [
        r["id"]
        for r in conn.execute(
            "SELECT id FROM questionnaire_parameters WHERE questionnaire_id = ?", (questionnaire_id,)
        ).fetchall()
    ]
    for pid in old_param_ids:
        conn.execute("DELETE FROM parameter_answers WHERE parameter_id = ?", (pid,))
    conn.execute("DELETE FROM questionnaire_parameters WHERE questionnaire_id = ?", (questionnaire_id,))

    for position, param in enumerate(parameters, start=1):
        cur = conn.execute(
            "INSERT INTO questionnaire_parameters (questionnaire_id, name, type, weight, position) VALUES (?, ?, ?, ?, ?)",
            (questionnaire_id, param["name"], param["type"], param["weight"], position),
        )
        param_id = cur.lastrowid
        answers = param.get("answers") or []
        if answers:
            conn.executemany(
                "INSERT INTO parameter_answers (parameter_id, text, position) VALUES (?, ?, ?)",
                [(param_id, text, i) for i, text in enumerate(answers, start=1)],
            )


def create_questionnaire(
    id: str, name: str, calculation_method: str, description: str | None, created_date: str, parameters: list[dict]
):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO questionnaires
            (id, name, calculation_method, type, status, tone, version, description, created_date, created_by)
        VALUES (?, ?, ?, 'מותאם', 'טיוטה', 'gray', 'v1', ?, ?, 'נופר טורגמן')
        """,
        (id, name, calculation_method, description, created_date),
    )
    _replace_questionnaire_parameters(conn, id, parameters)
    conn.commit()
    conn.close()
    return get_questionnaire(id)


def update_questionnaire(
    original_id: str,
    id: str,
    name: str,
    calculation_method: str,
    description: str | None,
    parameters: list[dict],
):
    conn = get_connection()
    conn.execute(
        "UPDATE questionnaires SET id = ?, name = ?, calculation_method = ?, description = ? WHERE id = ?",
        (id, name, calculation_method, description, original_id),
    )
    if original_id != id:
        conn.execute(
            "UPDATE model_questionnaires SET questionnaire_id = ? WHERE questionnaire_id = ?",
            (id, original_id),
        )
        conn.execute(
            "UPDATE questionnaire_parameters SET questionnaire_id = ? WHERE questionnaire_id = ?",
            (id, original_id),
        )
    _replace_questionnaire_parameters(conn, id, parameters)
    conn.commit()
    conn.close()
    return get_questionnaire(id)


def delete_questionnaire(questionnaire_id: str):
    conn = get_connection()
    param_ids = [
        r["id"]
        for r in conn.execute(
            "SELECT id FROM questionnaire_parameters WHERE questionnaire_id = ?", (questionnaire_id,)
        ).fetchall()
    ]
    for pid in param_ids:
        conn.execute("DELETE FROM parameter_answers WHERE parameter_id = ?", (pid,))
    conn.execute("DELETE FROM questionnaire_parameters WHERE questionnaire_id = ?", (questionnaire_id,))
    conn.execute("DELETE FROM model_questionnaires WHERE questionnaire_id = ?", (questionnaire_id,))
    conn.execute("DELETE FROM questionnaires WHERE id = ?", (questionnaire_id,))
    conn.commit()
    conn.close()


def duplicate_questionnaire(source_id: str, new_id: str, new_name: str, created_date: str):
    conn = get_connection()
    source = conn.execute("SELECT * FROM questionnaires WHERE id = ?", (source_id,)).fetchone()
    conn.execute(
        """
        INSERT INTO questionnaires
            (id, name, calculation_method, type, status, tone, version, description, created_date, created_by)
        VALUES (?, ?, ?, 'מותאם', 'טיוטה', 'gray', 'v1', ?, ?, 'נופר טורגמן')
        """,
        (new_id, new_name, source["calculation_method"], source["description"], created_date),
    )
    parameters = _get_parameters_with_answers(conn, source_id)
    _replace_questionnaire_parameters(conn, new_id, parameters)
    conn.commit()
    conn.close()


def get_all_roles():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM roles ORDER BY rowid ASC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_role(role_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def count_roles():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    conn.close()
    return count


def role_code_taken(code: str):
    conn = get_connection()
    row = conn.execute("SELECT 1 FROM roles WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def create_role(id: str, description: str | None):
    conn = get_connection()
    conn.execute("INSERT INTO roles (id, description) VALUES (?, ?)", (id, description))
    conn.commit()
    conn.close()
    return get_role(id)


def _attach_user_roles(conn, users):
    links = conn.execute("SELECT user_id, role_id FROM user_roles").fetchall()
    roles_by_user = {}
    for link in links:
        roles_by_user.setdefault(link["user_id"], []).append(link["role_id"])
    for user in users:
        user["role_ids"] = roles_by_user.get(user["id"], [])
    return users


def get_all_users():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM users ORDER BY rowid ASC").fetchall()]
    _attach_user_roles(conn, rows)
    conn.close()
    for row in rows:
        row["active"] = bool(row["active"])
    return rows


def get_user(user_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return None
    user = dict(row)
    _attach_user_roles(conn, [user])
    conn.close()
    user["active"] = bool(user["active"])
    return user


def count_users():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return count


def username_taken(username: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM users WHERE id = ? AND id != ?", (username, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM users WHERE id = ?", (username,)).fetchone()
    conn.close()
    return row is not None


def _replace_user_roles(conn, user_id: str, role_ids: list[str]):
    conn.execute("DELETE FROM user_roles WHERE user_id = ?", (user_id,))
    if role_ids:
        conn.executemany(
            "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
            [(user_id, r) for r in role_ids],
        )


def create_user(id: str, full_name: str, email: str | None, role_ids: list[str] | None = None):
    conn = get_connection()
    conn.execute(
        "INSERT INTO users (id, full_name, email, active) VALUES (?, ?, ?, 1)",
        (id, full_name, email),
    )
    _replace_user_roles(conn, id, role_ids or [])
    conn.commit()
    conn.close()
    return get_user(id)


def update_user(
    original_id: str, id: str, full_name: str, email: str | None, role_ids: list[str] | None = None
):
    conn = get_connection()
    conn.execute(
        "UPDATE users SET id = ?, full_name = ?, email = ? WHERE id = ?",
        (id, full_name, email, original_id),
    )
    if original_id != id:
        conn.execute("UPDATE user_roles SET user_id = ? WHERE user_id = ?", (id, original_id))
    if role_ids is not None:
        _replace_user_roles(conn, id, role_ids)
    conn.commit()
    conn.close()
    return get_user(id)


def _attach_model_names(conn, matrices):
    names_by_id = {
        row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM models").fetchall()
    }
    for matrix in matrices:
        matrix["model_name"] = names_by_id.get(matrix["model_id"])
    return matrices


def get_all_matrices():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM matrices ORDER BY rowid ASC").fetchall()]
    _attach_model_names(conn, rows)
    conn.close()
    return rows


def count_matrices():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM matrices").fetchone()[0]
    conn.close()
    return count


def get_matrix(matrix_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM matrices WHERE id = ?", (matrix_id,)).fetchone()
    if not row:
        conn.close()
        return None
    matrix = dict(row)
    _attach_model_names(conn, [matrix])
    conn.close()
    return matrix


def matrix_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM matrices WHERE id = ? AND id != ?", (code, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM matrices WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def matrix_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute(
            "SELECT 1 FROM matrices WHERE name = ? AND id != ?", (name, exclude_id)
        ).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM matrices WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def create_matrix(id: str, name: str, type: str, model_id: str, axes: int, cells: int):
    conn = get_connection()
    conn.execute(
        "INSERT INTO matrices (id, name, type, model_id, axes, cells) VALUES (?, ?, ?, ?, ?, ?)",
        (id, name, type, model_id, axes, cells),
    )
    conn.commit()
    conn.close()
    return get_matrix(id)


def update_matrix(
    original_id: str, id: str, name: str, type: str, model_id: str, axes: int, cells: int
):
    conn = get_connection()
    conn.execute(
        "UPDATE matrices SET id = ?, name = ?, type = ?, model_id = ?, axes = ?, cells = ? WHERE id = ?",
        (id, name, type, model_id, axes, cells, original_id),
    )
    conn.commit()
    conn.close()
    return get_matrix(id)


def duplicate_matrix(source_id: str, new_id: str, new_name: str):
    conn = get_connection()
    source = conn.execute("SELECT * FROM matrices WHERE id = ?", (source_id,)).fetchone()
    conn.execute(
        "INSERT INTO matrices (id, name, type, model_id, axes, cells) VALUES (?, ?, ?, ?, ?, ?)",
        (new_id, new_name, source["type"], source["model_id"], source["axes"], source["cells"]),
    )
    conn.commit()
    conn.close()
    return get_matrix(new_id)
