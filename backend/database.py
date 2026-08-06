"""
SQLite data access for the Rankings and Ranking Processes tables.

Rankings columns are the fields the report page displays: id, status,
tone (badge color), model_id (a models.id), team_id (a teams.id),
framework_issuer_id and subject_issuer_id (both issuers.id — the ranked
entity and the credit facility/framework it's ranked under are both
modeled as issuers), kind, code, approval_date (set once a ranking
reaches "בתוקף"; used to flag rankings expiring within 60 days — i.e.
approved 10+ months ago). get_all_rankings()/get_ranking() additionally
join in a display "model" string (name + active_version) from model_id,
a "team" display name from team_id, and "framework"/"subject" display
names from framework_issuer_id/subject_issuer_id, so renaming a model,
team, or issuer is reflected everywhere it's ranked. get_all_rankings()
also joins in final_score, final_rating, computed_score, computed_rating,
and completion from the matching ranking_processes row (same id — a
ranking and its process are the same תהליך, just displayed on two
different pages), plus a valid_from/valid_until window derived from
approval_date.

Canonical ranking statuses: טיוטה, בעבודה, ממתין לאישור, הוחזר, מאושר,
ממתין לוועדה, אושר ועדה, בתוקף, פג תוקף — plus the legacy בוטל/מושהה
still used by a couple of seed rows.

Ranking Processes columns are the fields the processes page displays: id,
subject_issuer_id, code, framework_issuer_id, status, tone, final_score,
final_rating, computed_score, computed_rating, completion — same
issuer-linked subject/framework as rankings, joined the same way by
get_all_processes(). computed_* is the model's raw output; final_* is
what was actually approved (a committee can approve a different rating
than the one computed). ranking_processes doesn't store model_id/team_id
itself; get_processes_by_status() joins those in from the matching
rankings row via _attach_process_context() for display.

The תור אישורים (approvals queue) page is a two-stage workflow over
ranking_processes.status: "בתהליך" (awaiting manager review) →
approve_manager moves it to "ממתין לוועדה" (awaiting committee review) →
approve_committee moves it to "אושר בוועדה" (final).

Issuers columns are the fields the issuers page displays: id (issuer
code), name, type, sector, country, active.

Teams columns are the fields the teams page displays: id (team code),
name, type, process_kind (the ranking process type the team runs, e.g.
FULL/LITE), committee_submission and validity_tracking (both booleans),
active.

Assets columns are the fields the assets page displays: id (asset
code), name, type, issuer_id (the issuer that owns the asset), cycle_stage
(בסיס / היתכנות, הקמה, הפעלה, or None), active. get_all_assets()/get_asset()
additionally join in issuer_name from the matching issuers row.

Models columns are the fields the models page displays: id (model
code), name, family, domain, owner (a users.id, not a display name),
active_version, versions_count, segments_count, questionnaires_count,
status, tone, last_updated, description. questionnaires_count is computed
from the model_questionnaires join table rather than stored.
get_all_models()/get_model() additionally join in owner_name from the
matching users row, so renaming a user updates every model they own.
models.rating_scale_id (a rating_scales.id) is the rating scale used to
translate that model's computed numeric score into a rating string;
get_all_models()/get_model() join in rating_scale_name for display.

Rating scales columns are the fields the rating scales page displays: id
(scale code), name, description. rating_scale_levels holds the ordered
label/range triples that make up a scale (rating_scale_id, label — e.g.
AAA/AA/A — min_value/max_value — the numeric score range that maps to
that label — position).

Questionnaires columns are the fields the questionnaires page displays:
id (code), name, calculation_method, type (מערכת/מותאם), status, tone,
version, description, created_date, created_by (a users.id, not a display
name). get_all_questionnaires()/get_questionnaire() additionally join in
created_by_name from the matching users row, so renaming a user updates
every questionnaire they created. model_questionnaires
links a model to the questionnaires assigned to it (model_id,
questionnaire_id).

questionnaire_parameters holds the scoring parameters that make up a
questionnaire (questionnaire_id, name, type, weight, position).
parameter_answers holds the ranked answer options for a parameter
(parameter_id, text, position).

Users columns are the fields the users page displays: id (username),
full_name, email, active. user_roles links a user to the roles
assigned to them (user_id, role_id).

Roles columns are the fields the roles permission-matrix page displays:
id (AD group code, e.g. RATING_ADMIN), name (Hebrew display name),
name_en, description, and seven boolean permission flags (can_view,
can_create, can_edit, can_delete, can_approve, can_committee_approve,
can_rerun) rendered as the matrix's checkmark columns.

Matrices columns are the fields the matrices page displays: id (matrix
code), name, type (e.g. רשת 2D), model_id (the model the matrix belongs
to), axes, cells, description, x_axis_label, y_axis_label.
get_all_matrices()/get_matrix() additionally join in model_name from the
matching models row. matrix_axis_values holds the ordered labels for
each axis (matrix_id, axis 'x'/'y', position, label); matrix_cells holds
the actual grid values (matrix_id, row_position, col_position, value).
get_matrix() attaches x_values/y_values (ordered label lists) and
cell_values (a row_position-major 2D array) when a grid has been
defined; cells is derived from len(x_values) * len(y_values) once a
grid exists, otherwise it stays a manually entered count.

Reports columns are the fields the reports (דוחות) catalog page
displays: id (report code, e.g. RPT-001), title, purpose (מטרה),
content (תוכן — free text describing what the report contains),
export_formats (comma-separated, e.g. "PDF,Excel,הדפסה"), and
report_type. report_type selects which live-data engine backs preview
and export for the 6 default reports (rating_detail, rating_summary,
rating_comparison, audit_trail, rating_expiry, rating_distribution);
it's None for user-created reports, which fall back to showing their
own purpose/content as the "preview". get_rating_summary_rows(),
get_rating_expiry_rows(), and get_rating_distribution() compute that
live data from the real rankings table.

Notification types columns are the fields the יומן ביקורת page's
"סוגי התראות" tab displays: id, name (תיאור), trigger_description
(טריגר), recipient_role (נמען — descriptive, not a users.id link),
channels (comma-separated: email/internal), timing, and
notification_email — the one field the page lets you edit, i.e. the
address that type's notifications get mailed to. Real SMTP delivery is
wired up via email_sender.py, configured through SMTP_* environment
variables (see backend/.env.example) — with no .env present, sending
degrades to a logged "not_configured" status rather than failing the
action that triggered the notification. notifications is the log
itself (notification_type_id, entity_id, message, created_at,
email_sent_to, email_status: sent/failed/not_configured/None,
email_error). Only four types are wired to real triggers: model
updates (MODEL_CHANGED), a process reaching ממתין לוועדה
(RATING_PENDING_COMMITTEE), and rating expiry, checked lazily on each
notifications fetch rather than by a real daily cron
(RATING_EXPIRING_30D/RATING_EXPIRED via refresh_expiry_notifications()).
The remaining types (submission/return flows, backups, stuck-process
tracking, unauthorized access) have no underlying data source in the
app yet and are catalog-only.
"""
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path

from . import email_sender

DB_PATH = Path(__file__).parent / "rankings.db"

SEED_ROWS = [
    {"id": "RP-2026-00031", "status": "ממתין לאישור", "tone": "amber", "model_id": "CORP-IL", "team_id": "INV-TEAM", "framework_issuer_id": "10000380", "kind": "מנפיק", "code": "LOAN-34285", "subject_issuer_id": "10000380", "approval_date": None},
    {"id": "RP-2026-00030", "status": "טיוטה", "tone": "gray", "model_id": "REAL-EST", "team_id": "INV-TEAM", "framework_issuer_id": "10000380", "kind": "מנפיק", "code": "LOAN-34285", "subject_issuer_id": "10000380", "approval_date": None},
    {"id": "RP-2026-00025", "status": "אושר ועדה", "tone": "green", "model_id": "CORP-IL", "team_id": "INV-TEAM", "framework_issuer_id": "10000380", "kind": "נכס", "code": "LOAN-33957", "subject_issuer_id": "10000380", "approval_date": "2026-06-01"},
    {"id": "RP-2026-00024", "status": "בעבודה", "tone": "blue", "model_id": "RE-PROJ", "team_id": "INV-TEAM", "framework_issuer_id": "10000380", "kind": "נכס", "code": "LOAN-34285", "subject_issuer_id": "10000380", "approval_date": None},
    {"id": "RP-2026-00023", "status": "בוטל", "tone": "red", "model_id": "RE-PROJ", "team_id": "INV-TEAM", "framework_issuer_id": "10000399", "kind": "נכס", "code": "LOAN-23967", "subject_issuer_id": "10000399", "approval_date": None},
    {"id": "RP-2026-00022", "status": "מושהה", "tone": "amber", "model_id": "RE-PROJ", "team_id": "INV-TEAM", "framework_issuer_id": "10000364", "kind": "נכס", "code": "LOAN-23486", "subject_issuer_id": "10000364", "approval_date": None},
    {"id": "RP-2026-00019", "status": "בתוקף", "tone": "green", "model_id": "RE-PROJ", "team_id": "INV-TEAM", "framework_issuer_id": "10000479", "kind": "נכס", "code": "LOAN-23903", "subject_issuer_id": "10000479", "approval_date": "2025-08-15"},
    {"id": "RP-2026-00018", "status": "בתוקף", "tone": "green", "model_id": "RE-PROJ", "team_id": "INV-TEAM", "framework_issuer_id": "10000365", "kind": "נכס", "code": "LOAN-9904", "subject_issuer_id": "10000365", "approval_date": "2026-05-10"},
]

SEED_TEAM_ROWS = [
    {"id": "INV-TEAM", "name": "צוות השקעות", "type": None, "process_kind": None, "committee_submission": False, "validity_tracking": False, "active": True},
    {"id": "RISK-TEAM", "name": "צוות ניהול סיכונים", "type": None, "process_kind": None, "committee_submission": False, "validity_tracking": False, "active": True},
]

SEED_PROCESS_ROWS = [
    {"id": "RP-2026-00031", "subject_issuer_id": "10000380", "code": "LOAN-34285", "framework_issuer_id": "10000380", "status": "בתהליך", "tone": "blue", "final_score": 1.00, "final_rating": "AAA", "computed_score": 1.00, "computed_rating": "AAA", "completion": 0},
    {"id": "RP-2026-00030", "subject_issuer_id": "10000380", "code": "LOAN-34285", "framework_issuer_id": "10000380", "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00025", "subject_issuer_id": "10000380", "code": "LOAN-33957", "framework_issuer_id": "10000380", "status": "אושר בוועדה", "tone": "green", "final_score": 3.28, "final_rating": "AA", "computed_score": 3.28, "computed_rating": "AA", "completion": 0},
    {"id": "RP-2026-00024", "subject_issuer_id": "10000380", "code": "LOAN-34285", "framework_issuer_id": "10000380", "status": "בתהליך", "tone": "blue", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00023", "subject_issuer_id": "10000399", "code": "LOAN-23967", "framework_issuer_id": "10000399", "status": "בוטל", "tone": "red", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00022", "subject_issuer_id": "10000364", "code": "LOAN-23486", "framework_issuer_id": "10000364", "status": "מושהה", "tone": "amber", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00019", "subject_issuer_id": "10000479", "code": "LOAN-23903", "framework_issuer_id": "10000479", "status": "בתוקף", "tone": "green", "final_score": 7.00, "final_rating": "A-", "computed_score": 5.26, "computed_rating": "A+", "completion": 0},
    {"id": "RP-2026-00018", "subject_issuer_id": "10000365", "code": "LOAN-9904", "framework_issuer_id": "10000365", "status": "בתוקף", "tone": "green", "final_score": 6.00, "final_rating": "A", "computed_score": 3.07, "computed_rating": "AA", "completion": 0},
    {"id": "RP-2026-00017", "subject_issuer_id": None, "code": "-", "framework_issuer_id": None, "status": "טיוטה", "tone": "gray", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
    {"id": "RP-2026-00016", "subject_issuer_id": "10000484", "code": "POLI-IL", "framework_issuer_id": None, "status": "פיקטיבי", "tone": "amber", "final_score": None, "final_rating": None, "computed_score": None, "computed_rating": None, "completion": 0},
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
    {"id": "10000380", "name": "חשבון מנוהל - Fuse Funding", "type": None, "sector": None, "country": None, "active": True},
    {"id": "10000381", "name": "Third Ave", "type": None, "sector": None, "country": None, "active": True},
    {"id": "10000382", "name": "Constellation", "type": None, "sector": None, "country": None, "active": True},
]

SEED_ASSET_ROWS = [
    {"id": "737", "name": "Real Estate Development LOAN A, LLC 1002", "type": "FRAMEWORK", "issuer_id": "10000380", "cycle_stage": None, "active": True},
    {"id": "445", "name": "Third Owners LLC-Building 368", "type": "FRAMEWORK", "issuer_id": "10000381", "cycle_stage": None, "active": True},
    {"id": "166", "name": "wall owner lp 60", "type": "FRAMEWORK", "issuer_id": "10000364", "cycle_stage": None, "active": True},
    {"id": "455", "name": "Allianz Archimedes SUZIE INVESTMENT", "type": "FRAMEWORK", "issuer_id": "10000399", "cycle_stage": None, "active": True},
    {"id": "729", "name": "Allianz – Constellation", "type": "FRAMEWORK", "issuer_id": "10000382", "cycle_stage": None, "active": True},
    {"id": "598", "name": "Allianz - Diam Coc (EPC 3)", "type": "FRAMEWORK", "issuer_id": "10000484", "cycle_stage": None, "active": True},
    {"id": "486", "name": "Allianz - project hercules 21.12.22", "type": "FRAMEWORK", "issuer_id": "10000367", "cycle_stage": None, "active": True},
    {"id": "615", "name": "Allianz - Project Impulse (EPC 3)", "type": "FRAMEWORK", "issuer_id": "10000497", "cycle_stage": None, "active": False},
    {"id": "407", "name": "Allianz - Project Runde", "type": "FRAMEWORK", "issuer_id": "10000368", "cycle_stage": None, "active": True},
    {"id": "762", "name": "Allianz - Rotera TRENDBELL DESIGNATED ACTIVITY COMPANY", "type": "FRAMEWORK", "issuer_id": "10000530", "cycle_stage": None, "active": True},
]

SEED_MODEL_ROWS = [
    {"id": "CORP-IL", "name": "תאגידים ישראל", "family": "תאגידים", "domain": "Corporate", "owner": "nofar.torgeman", "active_version": "v2", "versions_count": 2, "segments_count": 1, "questionnaires_count": 2, "status": "פעיל", "tone": "green", "last_updated": "15/03/2026"},
    {"id": "PROJ-FIN", "name": "מימון פרויקטים", "family": "מימון פרויקטים", "domain": "Project Finance", "owner": "david.shalom", "active_version": "v1", "versions_count": 1, "segments_count": 0, "questionnaires_count": 0, "status": "פעיל", "tone": "green", "last_updated": "10/04/2026"},
    {"id": "REAL-EST", "name": "תחנות כוח", "family": "מימון פרויקטים", "domain": "Project Finance", "owner": "nofar.torgeman", "active_version": "v1", "versions_count": 2, "segments_count": 1, "questionnaires_count": 0, "status": "פעיל", "tone": "green", "last_updated": "09/07/2026"},
    {"id": "RE-PROJ", "name": "דירוג פרויקט נדל\"ן יזמי", "family": "נדל\"ן יזמי", "domain": "Real Estate Project", "owner": "nofar.torgeman", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "פעיל", "tone": "green", "last_updated": "23/06/2026"},
    {"id": "TEST-NOFAR", "name": "test1", "family": "test", "domain": "Corporate", "owner": "nofar.torgeman", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "טיוטה", "tone": "gray", "last_updated": "09/07/2026"},
    {"id": "TEST-NOFAR1", "name": "test2", "family": "test", "domain": "Corporate", "owner": "nofar.torgeman", "active_version": "v1", "versions_count": 1, "segments_count": 1, "questionnaires_count": 2, "status": "טיוטה", "tone": "gray", "last_updated": "06/07/2026"},
]

SEED_RATING_SCALE_ROWS = [
    {"id": "STANDARD", "name": "סולם דירוג סטנדרטי", "description": None},
]

SEED_RATING_SCALE_LEVEL_ROWS = [
    {"rating_scale_id": "STANDARD", "label": "AAA", "min_value": 0, "max_value": 0.5},
    {"rating_scale_id": "STANDARD", "label": "AA", "min_value": 0.5, "max_value": 1},
    {"rating_scale_id": "STANDARD", "label": "A", "min_value": 1, "max_value": 1.5},
    {"rating_scale_id": "STANDARD", "label": "BBB", "min_value": 1.5, "max_value": 2},
    {"rating_scale_id": "STANDARD", "label": "BB", "min_value": 2, "max_value": 2.5},
    {"rating_scale_id": "STANDARD", "label": "B", "min_value": 2.5, "max_value": 3},
    {"rating_scale_id": "STANDARD", "label": "CCC", "min_value": 3, "max_value": 3.5},
    {"rating_scale_id": "STANDARD", "label": "CC", "min_value": 3.5, "max_value": 4},
    {"rating_scale_id": "STANDARD", "label": "C", "min_value": 4, "max_value": 4.5},
]

SEED_QUESTIONNAIRE_ROWS = [
    {"id": "SECTOR-BIZ-POS", "name": "מיצוב עיסקי", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v6", "description": None, "created_date": "01/03/2024", "created_by": "nofar.torgeman"},
    {"id": "SECTOR-IND-RATE", "name": "דירוג הענף בו פועלת החברה", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v6", "description": None, "created_date": "01/03/2024", "created_by": "nofar.torgeman"},
    {"id": "PP-WEIGHTED", "name": "תחנות כוח - משתנים משוקללים", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v9", "description": None, "created_date": "15/06/2024", "created_by": "nofar.torgeman"},
    {"id": "PP-ADJUSTMENTS", "name": "תחנות כוח - התאמות דירוג", "calculation_method": "סכום", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v25", "description": None, "created_date": "15/06/2024", "created_by": "nofar.torgeman"},
    {"id": "RE-PROJ-WEIGHTED", "name": "דירוג פרויקט נדל\"ן יזמי - משתנים משוקללים", "calculation_method": "ממוצע משוקלל", "type": "מערכת", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "15/06/2024", "created_by": "nofar.torgeman"},
    {"id": "RE-PROJ-ADJUST", "name": "דירוג פרויקט נדל\"ן יזמי - התאמות דירוג", "calculation_method": "סכום", "type": "מערכת", "status": "פעיל", "tone": "green", "version": "v1", "description": None, "created_date": "15/06/2024", "created_by": "nofar.torgeman"},
    {"id": "TEST", "name": "טסט", "calculation_method": "מקסימום", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "06/07/2026", "created_by": "nofar.torgeman"},
    {"id": "T1", "name": "test1", "calculation_method": "סכום", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v2", "description": None, "created_date": "06/07/2026", "created_by": "nofar.torgeman"},
    {"id": "RE-PROJ-MACRO", "name": "סיכוני מקרו פרויקט נדל\"ן יזמי", "calculation_method": "ממוצע משוקלל", "type": "מותאם", "status": "טיוטה", "tone": "gray", "version": "v1", "description": None, "created_date": "09/07/2026", "created_by": "nofar.torgeman"},
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
    {
        "id": "AD_RATING_ANALYST",
        "name": "אנליסט דירוג",
        "name_en": "Rating Analyst",
        "description": "פתיחת תהליכי דירוג, מילוי שאלונים, הזנת נתונים כמותיים, שליחה לאישור",
        "can_view": True, "can_create": True, "can_edit": True, "can_delete": False,
        "can_approve": False, "can_committee_approve": False, "can_rerun": False,
    },
    {
        "id": "RATING_APPROVER",
        "name": "מאשר דירוג",
        "name_en": "Rating Approver",
        "description": "בדיקת דירוגים, אישור או החזרה עם הערות. הפרדת סמכויות - לא יכול לאשר דירוג שהוא עצמו יצר",
        "can_view": True, "can_create": False, "can_edit": False, "can_delete": False,
        "can_approve": True, "can_committee_approve": False, "can_rerun": False,
    },
    {
        "id": "RATING_COMMITTEE",
        "name": "חבר ועדת דירוג",
        "name_en": "Rating Committee",
        "description": "אישור סופי של דירוגים הדורשים אישור ועדה",
        "can_view": True, "can_create": False, "can_edit": False, "can_delete": False,
        "can_approve": False, "can_committee_approve": True, "can_rerun": False,
    },
    {
        "id": "RATING_ADMIN",
        "name": "מנהל דירוג",
        "name_en": "Rating Admin",
        "description": "ניהול כל המטא-דאטה: מודלים, שאלונים, פרמטרים, תשובות, נוסחאות, מטריצות, טבלאות המרה",
        "can_view": True, "can_create": True, "can_edit": True, "can_delete": True,
        "can_approve": False, "can_committee_approve": False, "can_rerun": True,
    },
    {
        "id": "RATING_VIEWER",
        "name": "צופה",
        "name_en": "Viewer",
        "description": "צפייה בלבד בדירוגים, דוחות ולוח בקרה",
        "can_view": True, "can_create": False, "can_edit": False, "can_delete": False,
        "can_approve": False, "can_committee_approve": False, "can_rerun": False,
    },
    {
        "id": "RATING_SYSADMIN",
        "name": "מנהל מערכת",
        "name_en": "System Admin",
        "description": "ניהול טכני - ג'ובים, אודיט, הרשאות, הגדרות מערכת",
        "can_view": True, "can_create": True, "can_edit": True, "can_delete": True,
        "can_approve": False, "can_committee_approve": False, "can_rerun": True,
    },
]

# One-time migration: earlier seed data used these 3 placeholder role
# codes before the real default roles (above) were defined. Any user
# still linked to one of these gets remapped to its closest replacement.
LEGACY_ROLE_REMAP = {
    "RISK_MODEL_BUILDER": "RATING_ADMIN",
    "META_DATA_ADMIN": "RATING_ADMIN",
    "RATING_ANALYST": "AD_RATING_ANALYST",
}

# There's no login/session system yet, so newly created or duplicated
# questionnaires are attributed to this fixed user id (joined to their
# current full_name at read time via _attach_creator_names).
DEFAULT_CREATED_BY = "nofar.torgeman"

SEED_USER_ROWS = [
    {"id": "nofar.torgeman", "full_name": "אבי כהן", "email": None, "active": True},
    {"id": "david.shalom", "full_name": "משה לוי", "email": None, "active": True},
    {"id": "sarah.mizrahi", "full_name": "אברהם שלמה", "email": None, "active": True},
    {"id": "revital.wolkovich", "full_name": "ליטל שוורץ", "email": None, "active": True},
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

SEED_REPORT_ROWS = [
    {
        "id": "RPT-001",
        "title": "דו\"ח דירוג פרטני עבור מנפיק נתון",
        "purpose": "דו\"ח מפורט של תהליך דירוג בודד",
        "content": "פרטי מנפיק/נכס, פרטי מודל, ציון כולל ודירוג, ציוני קבוצות שאלונים, פירוט כל תשובה עם ציון, היסטוריית אישורים, מסלול אודיט",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "rating_detail",
    },
    {
        "id": "RPT-002",
        "title": "דו\"ח סיכום דירוגים",
        "purpose": "סיכום כל הדירוגים הפעילים במערכת",
        "content": "טבלה עם כל הדירוגים, סינון לפי: מודל, סטטוס, טווח תאריכים, דירוג. קיבוץ לפי מודל/דירוג/סטטוס. סטטיסטיקות סיכום.",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "rating_summary",
    },
    {
        "id": "RPT-003",
        "title": "דו\"ח השוואת דירוגים",
        "purpose": "השוואת דירוגים Side-by-Side עבור אותו מנפיק/נכס לאורך זמן",
        "content": "בחירת מנפיק/נכס ושני תאריכים. הצגה זה לצד זה. הדגשת שינויים: ירוק=שיפור, אדום=הרעה. ניתן להשוות גם יותר משני תאריכים, כדי לראות התפתחות דירוגים וציונים על פני זמן.",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "rating_comparison",
    },
    {
        "id": "RPT-004",
        "title": "דו\"ח אודיט",
        "purpose": "דו\"ח מסלול ביקורת - כל הפעולות במערכת",
        "content": "סינון לפי: משתמש, ישות, פעולה, טווח תאריכים. עמודות: תאריך/שעה, משתמש, פעולה, ישות, שדה, ערך ישן, ערך חדש, IP, Session.",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "audit_trail",
    },
    {
        "id": "RPT-005",
        "title": "דו\"ח תוקף דירוגים",
        "purpose": "מעקב אחר תפוגת דירוגים",
        "content": "דירוגים שפג תוקפם, דירוגים שיפוגו ב-30/60/90 יום. סטטיסטיקות תפוגה, תחזית. מיון לפי דחיפות.",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "rating_expiry",
    },
    {
        "id": "RPT-006",
        "title": "דו\"ח התפלגות דירוגים",
        "purpose": "ניתוח סטטיסטי של התפלגות הדירוגים",
        "content": "גרף עוגה - התפלגות לפי דירוג (AAA-D). גרף עמודות - כמות לפי מודל. קו מגמה - שינויים לאורך זמן. מפת חום - דירוגים לפי מודל × דירוג.",
        "export_formats": "PDF,Excel,הדפסה",
        "report_type": "rating_distribution",
    },
]

# id, name (תיאור), trigger_description (טריגר), recipient_role (נמען),
# channels (ערוץ, comma-separated: email/internal), timing (תזמון).
# is_live marks the types this session actually wires up to a real event —
# the rest (submission/return flows, backups, stuck-process tracking, auth)
# have no underlying data source in the app yet, so they stay defined here
# (configurable, visible in the catalog) without ever generating a real
# log entry, rather than faking history for events that never happened.
SEED_NOTIFICATION_TYPE_ROWS = [
    {
        "id": "RATING_EXPIRING_30D",
        "name": "תוקף דירוג עומד לפוג",
        "trigger_description": "30 יום לפני שתוקף הדירוג עומד לפוג",
        "recipient_role": "אנליסט",
        "channels": "email,internal",
        "timing": "יומי (06:00)",
        "notification_email": None,
    },
    {
        "id": "RATING_EXPIRED",
        "name": "תוקף דירוג פג",
        "trigger_description": "תאריך התפוגה עבר",
        "recipient_role": "אנליסט + מנהל",
        "channels": "email,internal",
        "timing": "יומי (06:00)",
        "notification_email": None,
    },
    {
        "id": "RATING_SUBMITTED",
        "name": "דירוג חדש נשלח לאישור",
        "trigger_description": "אנליסט שלח דירוג לאישור",
        "recipient_role": "מאשר",
        "channels": "email,internal",
        "timing": "מיידי",
        "notification_email": None,
    },
    {
        "id": "RATING_RETURNED",
        "name": "דירוג הוחזר עם הערות",
        "trigger_description": "מאשר החזיר דירוג עם הערות",
        "recipient_role": "אנליסט",
        "channels": "email,internal",
        "timing": "מיידי",
        "notification_email": None,
    },
    {
        "id": "RATING_PENDING_COMMITTEE",
        "name": "דירוג ממתין לוועדה",
        "trigger_description": "מאשר אישר ונדרש אישור ועדה",
        "recipient_role": "חברי ועדה",
        "channels": "email,internal",
        "timing": "מיידי",
        "notification_email": None,
    },
    {
        "id": "MODEL_CHANGED",
        "name": "שינוי במודל",
        "trigger_description": "מנהל דירוג שינה מטא-דאטה של מודל",
        "recipient_role": "מנהל דירוג",
        "channels": "internal",
        "timing": "מיידי",
        "notification_email": None,
    },
    {
        "id": "BACKUP_FAILED",
        "name": "גיבוי כשל",
        "trigger_description": "גיבוי אוטומטי של המערכת נכשל",
        "recipient_role": "מנהל מערכת",
        "channels": "email,internal",
        "timing": "מיידי",
        "notification_email": None,
    },
    {
        "id": "PROCESS_STUCK",
        "name": "תהליך תקוע",
        "trigger_description": "תהליך בסטטוס בעבודה מעל 14 יום",
        "recipient_role": "אנליסט + מנהל",
        "channels": "email,internal",
        "timing": "יומי",
        "notification_email": None,
    },
    {
        "id": "UNAUTHORIZED_ACCESS",
        "name": "ניסיון גישה לא מורשה",
        "trigger_description": "משתמש ניסה לגשת למערכת ללא הרשאה",
        "recipient_role": "מנהל מערכת",
        "channels": "email,internal",
        "timing": "מיידי",
        "notification_email": None,
    },
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    # Older schemas had `model`/`team`/`framework`/`subject` as NOT NULL text
    # columns before they were migrated to model_id/team_id/framework_issuer_id
    # (or framework_asset_id)/subject_issuer_id. SQLite can't drop a NOT NULL
    # constraint via ALTER TABLE, so if any of those legacy columns are still
    # in place, rebuild the table (preserving every column that's still used)
    # before applying the current schema — otherwise inserting a new row
    # without them violates the leftover NOT NULL constraint.
    legacy_rankings_cols = {
        r["name"]: r["notnull"]
        for r in conn.execute("PRAGMA table_info(rankings)").fetchall()
    }
    if any(legacy_rankings_cols.get(c) for c in ("model", "team", "framework", "subject")):
        conn.execute("ALTER TABLE rankings RENAME TO rankings_old")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rankings (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            tone TEXT NOT NULL,
            model_id TEXT REFERENCES models(id),
            team_id TEXT REFERENCES teams(id),
            framework_issuer_id TEXT REFERENCES issuers(id),
            framework_asset_id TEXT REFERENCES assets(id),
            kind TEXT NOT NULL,
            code TEXT NOT NULL,
            subject_issuer_id TEXT REFERENCES issuers(id),
            approval_date TEXT,
            data_date TEXT
        )
        """
    )
    if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rankings_old'").fetchone():
        old_cols = {r["name"] for r in conn.execute("PRAGMA table_info(rankings_old)").fetchall()}
        carry_cols = [
            c
            for c in (
                "id", "status", "tone", "model_id", "team_id", "framework_issuer_id",
                "framework_asset_id", "kind", "code", "subject_issuer_id", "approval_date", "data_date",
            )
            if c in old_cols
        ]
        cols_sql = ", ".join(carry_cols)
        conn.execute(f"INSERT INTO rankings ({cols_sql}) SELECT {cols_sql} FROM rankings_old")
        conn.execute("DROP TABLE rankings_old")
    rankings_columns = {row["name"] for row in conn.execute("PRAGMA table_info(rankings)").fetchall()}
    if "approval_date" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN approval_date TEXT")
    if "model_id" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN model_id TEXT")
    if "framework_issuer_id" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN framework_issuer_id TEXT")
    if "framework_asset_id" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN framework_asset_id TEXT")
    if "subject_issuer_id" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN subject_issuer_id TEXT")
    if "team_id" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN team_id TEXT")
    if "data_date" not in rankings_columns:
        conn.execute("ALTER TABLE rankings ADD COLUMN data_date TEXT")
    row_count = conn.execute("SELECT COUNT(*) FROM rankings").fetchone()[0]
    if row_count == 0:
        conn.executemany(
            """
            INSERT INTO rankings
                (id, status, tone, model_id, team_id, framework_issuer_id, kind, code, subject_issuer_id, approval_date)
            VALUES
                (:id, :status, :tone, :model_id, :team_id, :framework_issuer_id, :kind, :code, :subject_issuer_id, :approval_date)
            """,
            SEED_ROWS,
        )
        conn.commit()
    else:
        # Backfill rows created before the canonical status set / approval_date /
        # model_id / framework_issuer_id / subject_issuer_id / team_id existed.
        # Only touches rows still on their old status string or missing an id,
        # so any real status change made since (via the PATCH endpoint) is
        # preserved.
        old_statuses = {"בתהליך", "אושר בוועדה"}
        for seed in SEED_ROWS:
            row = conn.execute(
                "SELECT status, approval_date, model_id, framework_issuer_id, subject_issuer_id, team_id FROM rankings WHERE id = ?",
                (seed["id"],),
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
            if row["model_id"] is None and seed.get("model_id") is not None:
                conn.execute(
                    "UPDATE rankings SET model_id = ? WHERE id = ?",
                    (seed["model_id"], seed["id"]),
                )
            if row["team_id"] is None and seed.get("team_id") is not None:
                conn.execute(
                    "UPDATE rankings SET team_id = ? WHERE id = ?",
                    (seed["team_id"], seed["id"]),
                )
            if row["framework_issuer_id"] is None and seed.get("framework_issuer_id") is not None:
                conn.execute(
                    "UPDATE rankings SET framework_issuer_id = ? WHERE id = ?",
                    (seed["framework_issuer_id"], seed["id"]),
                )
            if row["subject_issuer_id"] is None and seed.get("subject_issuer_id") is not None:
                conn.execute(
                    "UPDATE rankings SET subject_issuer_id = ? WHERE id = ?",
                    (seed["subject_issuer_id"], seed["id"]),
                )
        conn.commit()

    # Same legacy-NOT-NULL situation as rankings above: older schemas had
    # `subject`/`framework` as NOT NULL text columns before the issuer-id
    # migration.
    legacy_process_cols = {
        r["name"]: r["notnull"]
        for r in conn.execute("PRAGMA table_info(ranking_processes)").fetchall()
    }
    if any(legacy_process_cols.get(c) for c in ("subject", "framework")):
        conn.execute("ALTER TABLE ranking_processes RENAME TO ranking_processes_old")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ranking_processes (
            id TEXT PRIMARY KEY,
            subject_issuer_id TEXT REFERENCES issuers(id),
            code TEXT NOT NULL,
            framework_issuer_id TEXT REFERENCES issuers(id),
            framework_asset_id TEXT REFERENCES assets(id),
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
    if conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ranking_processes_old'"
    ).fetchone():
        old_process_cols = {r["name"] for r in conn.execute("PRAGMA table_info(ranking_processes_old)").fetchall()}
        carry_process_cols = [
            c
            for c in (
                "id", "subject_issuer_id", "code", "framework_issuer_id", "framework_asset_id",
                "status", "tone", "final_score", "final_rating", "computed_score", "computed_rating", "completion",
            )
            if c in old_process_cols
        ]
        cols_sql = ", ".join(carry_process_cols)
        conn.execute(f"INSERT INTO ranking_processes ({cols_sql}) SELECT {cols_sql} FROM ranking_processes_old")
        conn.execute("DROP TABLE ranking_processes_old")
    process_columns = {row["name"] for row in conn.execute("PRAGMA table_info(ranking_processes)").fetchall()}
    for column in ("computed_score", "computed_rating"):
        if column not in process_columns:
            ddl_type = "REAL" if column == "computed_score" else "TEXT"
            conn.execute(f"ALTER TABLE ranking_processes ADD COLUMN {column} {ddl_type}")
    if "subject_issuer_id" not in process_columns:
        conn.execute("ALTER TABLE ranking_processes ADD COLUMN subject_issuer_id TEXT")
    if "framework_issuer_id" not in process_columns:
        conn.execute("ALTER TABLE ranking_processes ADD COLUMN framework_issuer_id TEXT")
    if "framework_asset_id" not in process_columns:
        conn.execute("ALTER TABLE ranking_processes ADD COLUMN framework_asset_id TEXT")
    process_count = conn.execute("SELECT COUNT(*) FROM ranking_processes").fetchone()[0]
    if process_count == 0:
        conn.executemany(
            """
            INSERT INTO ranking_processes
                (id, subject_issuer_id, code, framework_issuer_id, status, tone, final_score, final_rating,
                 computed_score, computed_rating, completion)
            VALUES
                (:id, :subject_issuer_id, :code, :framework_issuer_id, :status, :tone, :final_score, :final_rating,
                 :computed_score, :computed_rating, :completion)
            """,
            SEED_PROCESS_ROWS,
        )
        conn.commit()
    else:
        # Backfill computed_score/computed_rating/subject_issuer_id/
        # framework_issuer_id for rows created before these columns existed,
        # without clobbering any later real edit.
        for seed in SEED_PROCESS_ROWS:
            conn.execute(
                """
                UPDATE ranking_processes SET computed_score = :computed_score, computed_rating = :computed_rating
                WHERE id = :id AND computed_score IS NULL AND computed_rating IS NULL AND final_score IS NOT NULL
                """,
                seed,
            )
            row = conn.execute(
                "SELECT subject_issuer_id, framework_issuer_id FROM ranking_processes WHERE id = ?", (seed["id"],)
            ).fetchone()
            if row is None:
                continue
            if row["subject_issuer_id"] is None and seed.get("subject_issuer_id") is not None:
                conn.execute(
                    "UPDATE ranking_processes SET subject_issuer_id = ? WHERE id = ?",
                    (seed["subject_issuer_id"], seed["id"]),
                )
            if row["framework_issuer_id"] is None and seed.get("framework_issuer_id") is not None:
                conn.execute(
                    "UPDATE ranking_processes SET framework_issuer_id = ? WHERE id = ?",
                    (seed["framework_issuer_id"], seed["id"]),
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
    else:
        for seed in SEED_ISSUER_ROWS:
            existing = conn.execute("SELECT 1 FROM issuers WHERE id = ?", (seed["id"],)).fetchone()
            if existing is None:
                conn.execute(
                    """
                    INSERT INTO issuers (id, name, type, sector, country, active)
                    VALUES (:id, :name, :type, :sector, :country, :active)
                    """,
                    seed,
                )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            process_kind TEXT,
            committee_submission INTEGER NOT NULL DEFAULT 0,
            validity_tracking INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    team_count = conn.execute("SELECT COUNT(*) FROM teams").fetchone()[0]
    if team_count == 0:
        conn.executemany(
            """
            INSERT INTO teams (id, name, type, process_kind, committee_submission, validity_tracking, active)
            VALUES (:id, :name, :type, :process_kind, :committee_submission, :validity_tracking, :active)
            """,
            SEED_TEAM_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            issuer_id TEXT REFERENCES issuers(id),
            cycle_stage TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    asset_count = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    if asset_count == 0:
        conn.executemany(
            """
            INSERT INTO assets (id, name, type, issuer_id, cycle_stage, active)
            VALUES (:id, :name, :type, :issuer_id, :cycle_stage, :active)
            """,
            SEED_ASSET_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rating_scales (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT
        )
        """
    )
    rating_scale_count = conn.execute("SELECT COUNT(*) FROM rating_scales").fetchone()[0]
    if rating_scale_count == 0:
        conn.executemany(
            "INSERT INTO rating_scales (id, name, description) VALUES (:id, :name, :description)",
            SEED_RATING_SCALE_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rating_scale_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating_scale_id TEXT NOT NULL REFERENCES rating_scales(id),
            label TEXT NOT NULL,
            min_value REAL NOT NULL,
            max_value REAL NOT NULL,
            position INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    rating_scale_level_count = conn.execute("SELECT COUNT(*) FROM rating_scale_levels").fetchone()[0]
    if rating_scale_level_count == 0:
        for position, level in enumerate(SEED_RATING_SCALE_LEVEL_ROWS):
            conn.execute(
                """
                INSERT INTO rating_scale_levels (rating_scale_id, label, min_value, max_value, position)
                VALUES (?, ?, ?, ?, ?)
                """,
                (level["rating_scale_id"], level["label"], level["min_value"], level["max_value"], position),
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
            description TEXT,
            rating_scale_id TEXT REFERENCES rating_scales(id)
        )
        """
    )
    model_columns = {row["name"] for row in conn.execute("PRAGMA table_info(models)").fetchall()}
    if "description" not in model_columns:
        conn.execute("ALTER TABLE models ADD COLUMN description TEXT")
    if "rating_scale_id" not in model_columns:
        conn.execute("ALTER TABLE models ADD COLUMN rating_scale_id TEXT")
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
            weight INTEGER NOT NULL DEFAULT 0,
            position INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (model_id, questionnaire_id)
        )
        """
    )
    model_q_columns = {row["name"] for row in conn.execute("PRAGMA table_info(model_questionnaires)").fetchall()}
    if "weight" not in model_q_columns:
        conn.execute("ALTER TABLE model_questionnaires ADD COLUMN weight INTEGER NOT NULL DEFAULT 0")
    if "position" not in model_q_columns:
        conn.execute("ALTER TABLE model_questionnaires ADD COLUMN position INTEGER NOT NULL DEFAULT 0")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT,
            name_en TEXT,
            description TEXT,
            can_view INTEGER NOT NULL DEFAULT 0,
            can_create INTEGER NOT NULL DEFAULT 0,
            can_edit INTEGER NOT NULL DEFAULT 0,
            can_delete INTEGER NOT NULL DEFAULT 0,
            can_approve INTEGER NOT NULL DEFAULT 0,
            can_committee_approve INTEGER NOT NULL DEFAULT 0,
            can_rerun INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    role_columns = {row["name"] for row in conn.execute("PRAGMA table_info(roles)").fetchall()}
    for col, ddl in [
        ("name", "TEXT"),
        ("name_en", "TEXT"),
        ("can_view", "INTEGER NOT NULL DEFAULT 0"),
        ("can_create", "INTEGER NOT NULL DEFAULT 0"),
        ("can_edit", "INTEGER NOT NULL DEFAULT 0"),
        ("can_delete", "INTEGER NOT NULL DEFAULT 0"),
        ("can_approve", "INTEGER NOT NULL DEFAULT 0"),
        ("can_committee_approve", "INTEGER NOT NULL DEFAULT 0"),
        ("can_rerun", "INTEGER NOT NULL DEFAULT 0"),
    ]:
        if col not in role_columns:
            conn.execute(f"ALTER TABLE roles ADD COLUMN {col} {ddl}")

    role_count = conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    if role_count == 0:
        conn.executemany(
            """
            INSERT INTO roles (id, name, name_en, description, can_view, can_create, can_edit,
                                can_delete, can_approve, can_committee_approve, can_rerun)
            VALUES (:id, :name, :name_en, :description, :can_view, :can_create, :can_edit,
                    :can_delete, :can_approve, :can_committee_approve, :can_rerun)
            """,
            SEED_ROLE_ROWS,
        )
        conn.commit()
    else:
        existing_role_ids = {row["id"] for row in conn.execute("SELECT id FROM roles").fetchall()}
        new_role_ids = {r["id"] for r in SEED_ROLE_ROWS}
        if not (new_role_ids & existing_role_ids):
            for old_id, new_id in LEGACY_ROLE_REMAP.items():
                conn.execute("UPDATE OR IGNORE user_roles SET role_id = ? WHERE role_id = ?", (new_id, old_id))
                conn.execute("DELETE FROM user_roles WHERE role_id = ?", (old_id,))
            conn.execute(
                "DELETE FROM roles WHERE id IN ({})".format(",".join("?" * len(LEGACY_ROLE_REMAP))),
                list(LEGACY_ROLE_REMAP.keys()),
            )
            conn.executemany(
                """
                INSERT INTO roles (id, name, name_en, description, can_view, can_create, can_edit,
                                    can_delete, can_approve, can_committee_approve, can_rerun)
                VALUES (:id, :name, :name_en, :description, :can_view, :can_create, :can_edit,
                        :can_delete, :can_approve, :can_committee_approve, :can_rerun)
                """,
                SEED_ROLE_ROWS,
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
            cells INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            x_axis_label TEXT,
            y_axis_label TEXT
        )
        """
    )
    matrix_columns = {row["name"] for row in conn.execute("PRAGMA table_info(matrices)").fetchall()}
    for col in ("description", "x_axis_label", "y_axis_label"):
        if col not in matrix_columns:
            conn.execute(f"ALTER TABLE matrices ADD COLUMN {col} TEXT")
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

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS matrix_axis_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matrix_id TEXT NOT NULL REFERENCES matrices(id),
            axis TEXT NOT NULL CHECK (axis IN ('x', 'y')),
            position INTEGER NOT NULL,
            label TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS matrix_cells (
            matrix_id TEXT NOT NULL REFERENCES matrices(id),
            row_position INTEGER NOT NULL,
            col_position INTEGER NOT NULL,
            value REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (matrix_id, row_position, col_position)
        )
        """
    )
    _seed_budget_matrix_grid(conn)

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            purpose TEXT,
            content TEXT,
            export_formats TEXT NOT NULL DEFAULT 'PDF,Excel',
            report_type TEXT
        )
        """
    )
    report_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    if report_count == 0:
        conn.executemany(
            """
            INSERT INTO reports (id, title, purpose, content, export_formats, report_type)
            VALUES (:id, :title, :purpose, :content, :export_formats, :report_type)
            """,
            SEED_REPORT_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            trigger_description TEXT,
            recipient_role TEXT,
            channels TEXT NOT NULL DEFAULT 'internal',
            timing TEXT,
            notification_email TEXT
        )
        """
    )
    notification_type_count = conn.execute("SELECT COUNT(*) FROM notification_types").fetchone()[0]
    if notification_type_count == 0:
        conn.executemany(
            """
            INSERT INTO notification_types
                (id, name, trigger_description, recipient_role, channels, timing, notification_email)
            VALUES (:id, :name, :trigger_description, :recipient_role, :channels, :timing, :notification_email)
            """,
            SEED_NOTIFICATION_TYPE_ROWS,
        )
        conn.commit()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notification_type_id TEXT NOT NULL REFERENCES notification_types(id),
            entity_id TEXT,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            email_sent_to TEXT,
            email_status TEXT,
            email_error TEXT
        )
        """
    )
    notification_columns = {row["name"] for row in conn.execute("PRAGMA table_info(notifications)").fetchall()}
    for col in ("email_status", "email_error"):
        if col not in notification_columns:
            conn.execute(f"ALTER TABLE notifications ADD COLUMN {col} TEXT")

    conn.commit()
    conn.close()


def _seed_budget_matrix_grid(conn):
    """Seeds the real axis/cell data for BUDGET-MATRIX shown in the reference
    screenshot: value = (income deviation % - cost deviation %) / 100."""
    already_seeded = conn.execute(
        "SELECT COUNT(*) FROM matrix_axis_values WHERE matrix_id = ?", ("BUDGET-MATRIX",)
    ).fetchone()[0]
    if already_seeded:
        return
    x_pcts = [-20, -15, -10, -5, 0, 5, 10, 15, 20]
    y_pcts = [20, 15, 10, 5, 0, -5, -10, -15, -20]
    x_labels = [f"{p}%" if p <= 0 else f"+{p}%" for p in x_pcts]
    y_labels = [f"{p}%" if p <= 0 else f"+{p}%" for p in y_pcts]
    conn.execute(
        "UPDATE matrices SET description = ?, x_axis_label = ?, y_axis_label = ? WHERE id = ?",
        (
            "חיתוך סטיית הכנסות (ציר אופקי) מול סטיית עלויות (ציר אנכי). ציון חיובי = הרעה, שלילי = שיפור.",
            "סטיית הכנסות",
            "סטיית עלויות",
            "BUDGET-MATRIX",
        ),
    )
    conn.executemany(
        "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'x', ?, ?)",
        [("BUDGET-MATRIX", i, label) for i, label in enumerate(x_labels)],
    )
    conn.executemany(
        "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'y', ?, ?)",
        [("BUDGET-MATRIX", i, label) for i, label in enumerate(y_labels)],
    )
    cell_rows = [
        ("BUDGET-MATRIX", row_pos, col_pos, round((x_pct - y_pct) / 100, 2))
        for row_pos, y_pct in enumerate(y_pcts)
        for col_pos, x_pct in enumerate(x_pcts)
    ]
    conn.executemany(
        "INSERT INTO matrix_cells (matrix_id, row_position, col_position, value) VALUES (?, ?, ?, ?)",
        cell_rows,
    )


def _add_one_year(d):
    try:
        return d.replace(year=d.year + 1)
    except ValueError:
        # Feb 29 on a source date with no Feb 29 the following year
        return d.replace(year=d.year + 1, day=28)


def _attach_ranking_model_names(conn, rows):
    """Derive the display 'model' string (name + active_version) from each
    row's model_id, so renaming/re-versioning a model is reflected everywhere
    it's ranked instead of relying on a frozen copy of the text."""
    models_by_id = {
        row["id"]: f"{row['name']} {row['active_version']}"
        for row in conn.execute("SELECT id, name, active_version FROM models").fetchall()
    }
    for row in rows:
        row["model"] = models_by_id.get(row["model_id"])
    return rows


def _attach_issuer_display_names(conn, rows):
    """Derive the display 'framework'/'subject' strings from
    framework_issuer_id/subject_issuer_id, so renaming an issuer is
    reflected everywhere it's referenced instead of relying on a frozen
    copy of the text."""
    names_by_id = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM issuers").fetchall()}
    for row in rows:
        row["framework"] = names_by_id.get(row["framework_issuer_id"])
        row["subject"] = names_by_id.get(row["subject_issuer_id"])
    return rows


def _attach_team_names(conn, rows):
    """Derive the display 'team' string from team_id, so renaming a team is
    reflected everywhere it's referenced instead of relying on a frozen
    copy of the text."""
    names_by_id = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM teams").fetchall()}
    for row in rows:
        row["team"] = names_by_id.get(row["team_id"])
    return rows


def get_all_rankings():
    """Rankings joined with their matching תהליכי דירוג row (same id) for the
    score/rating/completion columns, plus a validity window derived from
    approval_date for בתוקף rankings."""
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM rankings ORDER BY id DESC").fetchall()]
    process_rows = conn.execute(
        "SELECT id, final_score, final_rating, computed_score, computed_rating, completion FROM ranking_processes"
    ).fetchall()
    _attach_ranking_model_names(conn, rows)
    _attach_issuer_display_names(conn, rows)
    _attach_team_names(conn, rows)
    conn.close()

    process_by_id = {p["id"]: dict(p) for p in process_rows}
    for row in rows:
        proc = process_by_id.get(row["id"])
        row["final_score"] = proc["final_score"] if proc else None
        row["final_rating"] = proc["final_rating"] if proc else None
        row["computed_score"] = proc["computed_score"] if proc else None
        row["computed_rating"] = proc["computed_rating"] if proc else None
        row["completion"] = proc["completion"] if proc else 0

        row["data_date"] = (
            date.fromisoformat(row["data_date"]).strftime("%d/%m/%Y") if row["data_date"] else None
        )
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
    if not row:
        conn.close()
        return None
    ranking = dict(row)
    _attach_ranking_model_names(conn, [ranking])
    _attach_issuer_display_names(conn, [ranking])
    _attach_team_names(conn, [ranking])
    conn.close()
    return ranking


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
    rows = [dict(row) for row in conn.execute("SELECT * FROM ranking_processes ORDER BY id DESC").fetchall()]
    _attach_issuer_display_names(conn, rows)
    conn.close()
    return rows


def count_processes():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM ranking_processes").fetchone()[0]
    conn.close()
    return count


def get_process(process_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM ranking_processes WHERE id = ?", (process_id,)).fetchone()
    if not row:
        conn.close()
        return None
    process = dict(row)
    _attach_issuer_display_names(conn, [process])
    conn.close()
    return process


def _attach_process_context(conn, processes):
    """ranking_processes doesn't store model_id/team_id itself — the
    matching rankings row (same id) does, since they're two views of the
    same תהליך. Pull in display names for the approvals queue."""
    context_by_id = {
        row["id"]: row for row in conn.execute("SELECT id, model_id, team_id FROM rankings").fetchall()
    }
    models_by_id = {
        row["id"]: f"{row['name']} {row['active_version']}"
        for row in conn.execute("SELECT id, name, active_version FROM models").fetchall()
    }
    teams_by_id = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM teams").fetchall()}
    for p in processes:
        ctx = context_by_id.get(p["id"])
        p["model"] = models_by_id.get(ctx["model_id"]) if ctx else None
        p["team"] = teams_by_id.get(ctx["team_id"]) if ctx else None
    return processes


def get_processes_by_status(status: str):
    """Real data backing the תור אישורים queue's two tabs."""
    conn = get_connection()
    rows = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM ranking_processes WHERE status = ? ORDER BY id DESC", (status,)
        ).fetchall()
    ]
    _attach_issuer_display_names(conn, rows)
    _attach_process_context(conn, rows)
    conn.close()
    return rows


def count_processes_by_status(status: str):
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM ranking_processes WHERE status = ?", (status,)).fetchone()[0]
    conn.close()
    return count


def update_process_status(process_id: str, status: str, tone: str):
    conn = get_connection()
    conn.execute(
        "UPDATE ranking_processes SET status = ?, tone = ? WHERE id = ?",
        (status, tone, process_id),
    )
    conn.commit()
    conn.close()
    process = get_process(process_id)
    if status == "ממתין לוועדה":
        _create_notification(
            "RATING_PENDING_COMMITTEE",
            process_id,
            f"התהליך {process_id} ({process['code']}) אושר על ידי מנהל וממתין כעת לאישור ועדה",
        )
    return process


def _next_process_id():
    conn = get_connection()
    max_num = 0
    for table in ("rankings", "ranking_processes"):
        for row in conn.execute(f"SELECT id FROM {table}").fetchall():
            match = re.match(r"RP-\d{4}-(\d+)", row["id"])
            if match:
                max_num = max(max_num, int(match.group(1)))
    conn.close()
    return f"RP-{date.today().year}-{max_num + 1:05d}"


def create_ranking_process(
    model_id: str,
    kind: str,
    framework_issuer_id: str | None,
    framework_asset_id: str | None,
    data_date: str | None,
):
    """Creates a new תהליך דירוג: a rankings row (for the report page) and a
    matching ranking_processes row (for the processes page), sharing the same
    generated id. subject_issuer_id always mirrors the resolved
    framework_issuer_id — when the framework is an asset, that's the asset's
    own issuer_id, so the ranked entity is still the issuer that owns it."""
    conn = get_connection()
    if kind == "נכס":
        asset = conn.execute("SELECT issuer_id FROM assets WHERE id = ?", (framework_asset_id,)).fetchone()
        resolved_issuer_id = asset["issuer_id"] if asset else None
    else:
        resolved_issuer_id = framework_issuer_id

    new_id = _next_process_id()
    conn.execute(
        """
        INSERT INTO rankings
            (id, status, tone, model_id, team_id, framework_issuer_id, framework_asset_id, kind, code,
             subject_issuer_id, approval_date, data_date)
        VALUES (?, 'טיוטה', 'gray', ?, NULL, ?, ?, ?, '-', ?, NULL, ?)
        """,
        (new_id, model_id, resolved_issuer_id, framework_asset_id, kind, resolved_issuer_id, data_date),
    )
    conn.execute(
        """
        INSERT INTO ranking_processes
            (id, subject_issuer_id, code, framework_issuer_id, framework_asset_id, status, tone,
             final_score, final_rating, computed_score, computed_rating, completion)
        VALUES (?, ?, '-', ?, ?, 'טיוטה', 'gray', NULL, NULL, NULL, NULL, 0)
        """,
        (new_id, resolved_issuer_id, resolved_issuer_id, framework_asset_id),
    )
    conn.commit()
    conn.close()
    return get_process(new_id)


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


def get_all_teams():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM teams ORDER BY rowid ASC").fetchall()
    conn.close()
    return [
        {**dict(row), "committee_submission": bool(row["committee_submission"]), "validity_tracking": bool(row["validity_tracking"]), "active": bool(row["active"])}
        for row in rows
    ]


def count_teams():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM teams").fetchone()[0]
    conn.close()
    return count


def get_team(team_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    conn.close()
    if not row:
        return None
    team = dict(row)
    team["committee_submission"] = bool(team["committee_submission"])
    team["validity_tracking"] = bool(team["validity_tracking"])
    team["active"] = bool(team["active"])
    return team


def team_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM teams WHERE id = ? AND id != ?", (code, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM teams WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def team_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM teams WHERE name = ? AND id != ?", (name, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM teams WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def create_team(
    id: str,
    name: str,
    type: str | None,
    process_kind: str | None,
    committee_submission: bool,
    validity_tracking: bool,
):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO teams (id, name, type, process_kind, committee_submission, validity_tracking, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        """,
        (id, name, type, process_kind, committee_submission, validity_tracking),
    )
    conn.commit()
    conn.close()
    return get_team(id)


def update_team(
    original_id: str,
    id: str,
    name: str,
    type: str | None,
    process_kind: str | None,
    committee_submission: bool,
    validity_tracking: bool,
):
    conn = get_connection()
    conn.execute(
        """
        UPDATE teams SET id = ?, name = ?, type = ?, process_kind = ?, committee_submission = ?, validity_tracking = ?
        WHERE id = ?
        """,
        (id, name, type, process_kind, committee_submission, validity_tracking, original_id),
    )
    conn.commit()
    conn.close()
    return get_team(id)


def _attach_issuer_names(conn, assets):
    names_by_id = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM issuers").fetchall()}
    for asset in assets:
        asset["issuer_name"] = names_by_id.get(asset["issuer_id"])
    return assets


def get_all_assets():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM assets ORDER BY rowid ASC").fetchall()]
    _attach_issuer_names(conn, rows)
    conn.close()
    return [{**row, "active": bool(row["active"])} for row in rows]


def count_assets():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    conn.close()
    return count


def get_asset(asset_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if not row:
        conn.close()
        return None
    asset = dict(row)
    _attach_issuer_names(conn, [asset])
    conn.close()
    asset["active"] = bool(asset["active"])
    return asset


def asset_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM assets WHERE id = ? AND id != ?", (code, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM assets WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def create_asset(id: str, name: str, type: str | None, issuer_id: str | None, cycle_stage: str | None):
    conn = get_connection()
    conn.execute(
        "INSERT INTO assets (id, name, type, issuer_id, cycle_stage, active) VALUES (?, ?, ?, ?, ?, 1)",
        (id, name, type, issuer_id, cycle_stage),
    )
    conn.commit()
    conn.close()
    return get_asset(id)


def update_asset(
    original_id: str, id: str, name: str, type: str | None, issuer_id: str | None, cycle_stage: str | None
):
    conn = get_connection()
    conn.execute(
        "UPDATE assets SET id = ?, name = ?, type = ?, issuer_id = ?, cycle_stage = ? WHERE id = ?",
        (id, name, type, issuer_id, cycle_stage, original_id),
    )
    conn.commit()
    conn.close()
    return get_asset(id)


def _attach_questionnaire_ids(conn, models):
    links = conn.execute(
        "SELECT model_id, questionnaire_id, weight FROM model_questionnaires ORDER BY position ASC"
    ).fetchall()
    entries_by_model = {}
    for link in links:
        entries_by_model.setdefault(link["model_id"], []).append(
            {"id": link["questionnaire_id"], "weight": link["weight"]}
        )
    for model in models:
        entries = entries_by_model.get(model["id"], [])
        model["questionnaires"] = entries
        model["questionnaire_ids"] = [e["id"] for e in entries]
        model["questionnaires_count"] = len(entries)
    return models


def _attach_owner_names(conn, models):
    names_by_id = {row["id"]: row["full_name"] for row in conn.execute("SELECT id, full_name FROM users").fetchall()}
    for model in models:
        model["owner_name"] = names_by_id.get(model["owner"], model["owner"])
    return models


def _attach_rating_scale_names(conn, models):
    names_by_id = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM rating_scales").fetchall()}
    for model in models:
        model["rating_scale_name"] = names_by_id.get(model["rating_scale_id"])
    return models


def get_all_models():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM models ORDER BY rowid ASC").fetchall()]
    _attach_questionnaire_ids(conn, rows)
    _attach_owner_names(conn, rows)
    _attach_rating_scale_names(conn, rows)
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
    _attach_owner_names(conn, [model])
    _attach_rating_scale_names(conn, [model])
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
    questionnaires: list[dict] | None = None,
    rating_scale_id: str | None = None,
):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO models
            (id, name, family, domain, owner, active_version, versions_count,
             segments_count, questionnaires_count, status, tone, last_updated, description, rating_scale_id)
        VALUES (?, ?, ?, ?, ?, 'v1', 1, 0, 0, 'טיוטה', 'gray', ?, ?, ?)
        """,
        (id, name, family, domain, owner, last_updated, description, rating_scale_id),
    )
    _replace_model_questionnaires(conn, id, questionnaires or [])
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
    questionnaires: list[dict] | None = None,
    rating_scale_id: str | None = None,
):
    conn = get_connection()
    conn.execute(
        """
        UPDATE models SET id = ?, name = ?, family = ?, domain = ?, owner = ?, last_updated = ?, description = ?,
            rating_scale_id = ?
        WHERE id = ?
        """,
        (id, name, family, domain, owner, last_updated, description, rating_scale_id, original_id),
    )
    if original_id != id:
        conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (original_id,))
    if questionnaires is not None:
        _replace_model_questionnaires(conn, id, questionnaires)
    conn.commit()
    conn.close()
    _create_notification("MODEL_CHANGED", id, f"מודל \"{name}\" ({id}) עודכן")
    return get_model(id)


def delete_model(model_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (model_id,))
    conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()


def _rating_scale_level_counts(conn):
    rows = conn.execute(
        "SELECT rating_scale_id, COUNT(*) AS n FROM rating_scale_levels GROUP BY rating_scale_id"
    ).fetchall()
    return {row["rating_scale_id"]: row["n"] for row in rows}


def get_all_rating_scales():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM rating_scales ORDER BY rowid ASC").fetchall()]
    counts = _rating_scale_level_counts(conn)
    for row in rows:
        row["levels_count"] = counts.get(row["id"], 0)
    conn.close()
    return rows


def count_rating_scales():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM rating_scales").fetchone()[0]
    conn.close()
    return count


def _get_rating_scale_levels(conn, rating_scale_id: str):
    rows = conn.execute(
        "SELECT label, min_value, max_value FROM rating_scale_levels WHERE rating_scale_id = ? ORDER BY position ASC",
        (rating_scale_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_rating_scale(rating_scale_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM rating_scales WHERE id = ?", (rating_scale_id,)).fetchone()
    if not row:
        conn.close()
        return None
    scale = dict(row)
    scale["levels"] = _get_rating_scale_levels(conn, rating_scale_id)
    scale["levels_count"] = len(scale["levels"])
    conn.close()
    return scale


def rating_scale_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM rating_scales WHERE id = ? AND id != ?", (code, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM rating_scales WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def rating_scale_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM rating_scales WHERE name = ? AND id != ?", (name, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM rating_scales WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def _replace_rating_scale_levels(conn, rating_scale_id: str, levels: list[dict]):
    conn.execute("DELETE FROM rating_scale_levels WHERE rating_scale_id = ?", (rating_scale_id,))
    if levels:
        conn.executemany(
            """
            INSERT INTO rating_scale_levels (rating_scale_id, label, min_value, max_value, position)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (rating_scale_id, lvl["label"], lvl["min_value"], lvl["max_value"], i)
                for i, lvl in enumerate(levels)
            ],
        )


def create_rating_scale(id: str, name: str, description: str | None, levels: list[dict]):
    conn = get_connection()
    conn.execute(
        "INSERT INTO rating_scales (id, name, description) VALUES (?, ?, ?)",
        (id, name, description),
    )
    _replace_rating_scale_levels(conn, id, levels)
    conn.commit()
    conn.close()
    return get_rating_scale(id)


def update_rating_scale(original_id: str, id: str, name: str, description: str | None, levels: list[dict]):
    conn = get_connection()
    conn.execute(
        "UPDATE rating_scales SET id = ?, name = ?, description = ? WHERE id = ?",
        (id, name, description, original_id),
    )
    if original_id != id:
        conn.execute("UPDATE rating_scale_levels SET rating_scale_id = ? WHERE rating_scale_id = ?", (id, original_id))
        conn.execute("UPDATE models SET rating_scale_id = ? WHERE rating_scale_id = ?", (id, original_id))
    _replace_rating_scale_levels(conn, id, levels)
    conn.commit()
    conn.close()
    return get_rating_scale(id)


def delete_rating_scale(rating_scale_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM rating_scale_levels WHERE rating_scale_id = ?", (rating_scale_id,))
    conn.execute("UPDATE models SET rating_scale_id = NULL WHERE rating_scale_id = ?", (rating_scale_id,))
    conn.execute("DELETE FROM rating_scales WHERE id = ?", (rating_scale_id,))
    conn.commit()
    conn.close()


def _replace_model_questionnaires(conn, model_id: str, questionnaires: list[dict]):
    conn.execute("DELETE FROM model_questionnaires WHERE model_id = ?", (model_id,))
    if questionnaires:
        conn.executemany(
            "INSERT INTO model_questionnaires (model_id, questionnaire_id, weight, position) VALUES (?, ?, ?, ?)",
            [(model_id, q["id"], q["weight"], i) for i, q in enumerate(questionnaires)],
        )


def _questionnaire_parameter_counts(conn):
    rows = conn.execute(
        "SELECT questionnaire_id, COUNT(*) AS n FROM questionnaire_parameters GROUP BY questionnaire_id"
    ).fetchall()
    return {row["questionnaire_id"]: row["n"] for row in rows}


def _attach_creator_names(conn, questionnaires):
    names_by_id = {row["id"]: row["full_name"] for row in conn.execute("SELECT id, full_name FROM users").fetchall()}
    for q in questionnaires:
        q["created_by_name"] = names_by_id.get(q["created_by"], q["created_by"])
    return questionnaires


def get_all_questionnaires():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM questionnaires ORDER BY rowid ASC").fetchall()]
    counts = _questionnaire_parameter_counts(conn)
    for row in rows:
        row["parameters_count"] = counts.get(row["id"], 0)
    _attach_creator_names(conn, rows)
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
    _attach_creator_names(conn, [questionnaire])
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
        VALUES (?, ?, ?, 'מותאם', 'טיוטה', 'gray', 'v1', ?, ?, ?)
        """,
        (id, name, calculation_method, description, created_date, DEFAULT_CREATED_BY),
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
        VALUES (?, ?, ?, 'מותאם', 'טיוטה', 'gray', 'v1', ?, ?, ?)
        """,
        (new_id, new_name, source["calculation_method"], source["description"], created_date, DEFAULT_CREATED_BY),
    )
    parameters = _get_parameters_with_answers(conn, source_id)
    _replace_questionnaire_parameters(conn, new_id, parameters)
    conn.commit()
    conn.close()


ROLE_PERMISSION_FIELDS = [
    "can_view", "can_create", "can_edit", "can_delete",
    "can_approve", "can_committee_approve", "can_rerun",
]


def _cast_role_permissions(role):
    for field in ROLE_PERMISSION_FIELDS:
        role[field] = bool(role[field])
    return role


def get_all_roles():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM roles ORDER BY rowid ASC").fetchall()]
    conn.close()
    return [_cast_role_permissions(r) for r in rows]


def get_role(role_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
    conn.close()
    return _cast_role_permissions(dict(row)) if row else None


def count_roles():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    conn.close()
    return count


def role_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM roles WHERE id = ? AND id != ?", (code, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM roles WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def role_name_taken(name: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM roles WHERE name = ? AND id != ?", (name, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM roles WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row is not None


def create_role(
    id: str,
    name: str,
    name_en: str | None,
    description: str | None,
    can_view: bool,
    can_create: bool,
    can_edit: bool,
    can_delete: bool,
    can_approve: bool,
    can_committee_approve: bool,
    can_rerun: bool,
):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO roles (id, name, name_en, description, can_view, can_create, can_edit,
                            can_delete, can_approve, can_committee_approve, can_rerun)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            id, name, name_en, description,
            int(can_view), int(can_create), int(can_edit), int(can_delete),
            int(can_approve), int(can_committee_approve), int(can_rerun),
        ),
    )
    conn.commit()
    conn.close()
    return get_role(id)


def update_role(
    original_id: str,
    id: str,
    name: str,
    name_en: str | None,
    description: str | None,
    can_view: bool,
    can_create: bool,
    can_edit: bool,
    can_delete: bool,
    can_approve: bool,
    can_committee_approve: bool,
    can_rerun: bool,
):
    conn = get_connection()
    conn.execute(
        """
        UPDATE roles SET id = ?, name = ?, name_en = ?, description = ?, can_view = ?, can_create = ?,
            can_edit = ?, can_delete = ?, can_approve = ?, can_committee_approve = ?, can_rerun = ?
        WHERE id = ?
        """,
        (
            id, name, name_en, description,
            int(can_view), int(can_create), int(can_edit), int(can_delete),
            int(can_approve), int(can_committee_approve), int(can_rerun),
            original_id,
        ),
    )
    if original_id != id:
        conn.execute("UPDATE user_roles SET role_id = ? WHERE role_id = ?", (id, original_id))
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


def _attach_grid(conn, matrix):
    x_values = [
        r["label"]
        for r in conn.execute(
            "SELECT label FROM matrix_axis_values WHERE matrix_id = ? AND axis = 'x' ORDER BY position ASC",
            (matrix["id"],),
        ).fetchall()
    ]
    y_values = [
        r["label"]
        for r in conn.execute(
            "SELECT label FROM matrix_axis_values WHERE matrix_id = ? AND axis = 'y' ORDER BY position ASC",
            (matrix["id"],),
        ).fetchall()
    ]
    matrix["x_values"] = x_values
    matrix["y_values"] = y_values
    if x_values and y_values:
        grid = [[0] * len(x_values) for _ in y_values]
        for r in conn.execute(
            "SELECT row_position, col_position, value FROM matrix_cells WHERE matrix_id = ?",
            (matrix["id"],),
        ).fetchall():
            if r["row_position"] < len(y_values) and r["col_position"] < len(x_values):
                grid[r["row_position"]][r["col_position"]] = r["value"]
        matrix["cell_values"] = grid
    else:
        matrix["cell_values"] = []
    return matrix


def get_matrix(matrix_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM matrices WHERE id = ?", (matrix_id,)).fetchone()
    if not row:
        conn.close()
        return None
    matrix = dict(row)
    _attach_model_names(conn, [matrix])
    _attach_grid(conn, matrix)
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


def _replace_matrix_grid(
    conn, matrix_id: str, x_values: list[str], y_values: list[str], cell_values: list[list[float]]
):
    conn.execute("DELETE FROM matrix_axis_values WHERE matrix_id = ?", (matrix_id,))
    conn.execute("DELETE FROM matrix_cells WHERE matrix_id = ?", (matrix_id,))
    if x_values:
        conn.executemany(
            "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'x', ?, ?)",
            [(matrix_id, i, label) for i, label in enumerate(x_values)],
        )
    if y_values:
        conn.executemany(
            "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'y', ?, ?)",
            [(matrix_id, i, label) for i, label in enumerate(y_values)],
        )
    if x_values and y_values and cell_values:
        cell_rows = [
            (matrix_id, r, c, cell_values[r][c])
            for r in range(len(y_values))
            for c in range(len(x_values))
        ]
        conn.executemany(
            "INSERT INTO matrix_cells (matrix_id, row_position, col_position, value) VALUES (?, ?, ?, ?)",
            cell_rows,
        )


def create_matrix(
    id: str,
    name: str,
    type: str,
    model_id: str,
    axes: int,
    cells: int,
    description: str | None = None,
    x_axis_label: str | None = None,
    y_axis_label: str | None = None,
    x_values: list[str] | None = None,
    y_values: list[str] | None = None,
    cell_values: list[list[float]] | None = None,
):
    x_values = x_values or []
    y_values = y_values or []
    final_cells = len(x_values) * len(y_values) if x_values and y_values else cells
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO matrices (id, name, type, model_id, axes, cells, description, x_axis_label, y_axis_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (id, name, type, model_id, axes, final_cells, description, x_axis_label, y_axis_label),
    )
    _replace_matrix_grid(conn, id, x_values, y_values, cell_values or [])
    conn.commit()
    conn.close()
    return get_matrix(id)


def update_matrix(
    original_id: str,
    id: str,
    name: str,
    type: str,
    model_id: str,
    axes: int,
    cells: int,
    description: str | None = None,
    x_axis_label: str | None = None,
    y_axis_label: str | None = None,
    x_values: list[str] | None = None,
    y_values: list[str] | None = None,
    cell_values: list[list[float]] | None = None,
):
    x_values = x_values or []
    y_values = y_values or []
    final_cells = len(x_values) * len(y_values) if x_values and y_values else cells
    conn = get_connection()
    conn.execute(
        """
        UPDATE matrices SET id = ?, name = ?, type = ?, model_id = ?, axes = ?, cells = ?,
            description = ?, x_axis_label = ?, y_axis_label = ?
        WHERE id = ?
        """,
        (id, name, type, model_id, axes, final_cells, description, x_axis_label, y_axis_label, original_id),
    )
    if original_id != id:
        conn.execute("UPDATE matrix_axis_values SET matrix_id = ? WHERE matrix_id = ?", (id, original_id))
        conn.execute("UPDATE matrix_cells SET matrix_id = ? WHERE matrix_id = ?", (id, original_id))
    _replace_matrix_grid(conn, id, x_values, y_values, cell_values or [])
    conn.commit()
    conn.close()
    return get_matrix(id)


def duplicate_matrix(source_id: str, new_id: str, new_name: str):
    conn = get_connection()
    source = conn.execute("SELECT * FROM matrices WHERE id = ?", (source_id,)).fetchone()
    conn.execute(
        """
        INSERT INTO matrices (id, name, type, model_id, axes, cells, description, x_axis_label, y_axis_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id,
            new_name,
            source["type"],
            source["model_id"],
            source["axes"],
            source["cells"],
            source["description"],
            source["x_axis_label"],
            source["y_axis_label"],
        ),
    )
    x_rows = conn.execute(
        "SELECT position, label FROM matrix_axis_values WHERE matrix_id = ? AND axis = 'x' ORDER BY position ASC",
        (source_id,),
    ).fetchall()
    y_rows = conn.execute(
        "SELECT position, label FROM matrix_axis_values WHERE matrix_id = ? AND axis = 'y' ORDER BY position ASC",
        (source_id,),
    ).fetchall()
    if x_rows:
        conn.executemany(
            "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'x', ?, ?)",
            [(new_id, r["position"], r["label"]) for r in x_rows],
        )
    if y_rows:
        conn.executemany(
            "INSERT INTO matrix_axis_values (matrix_id, axis, position, label) VALUES (?, 'y', ?, ?)",
            [(new_id, r["position"], r["label"]) for r in y_rows],
        )
    cell_rows = conn.execute(
        "SELECT row_position, col_position, value FROM matrix_cells WHERE matrix_id = ?", (source_id,)
    ).fetchall()
    if cell_rows:
        conn.executemany(
            "INSERT INTO matrix_cells (matrix_id, row_position, col_position, value) VALUES (?, ?, ?, ?)",
            [(new_id, r["row_position"], r["col_position"], r["value"]) for r in cell_rows],
        )
    conn.commit()
    conn.close()
    return get_matrix(new_id)


def get_all_reports():
    conn = get_connection()
    rows = [dict(row) for row in conn.execute("SELECT * FROM reports ORDER BY rowid ASC").fetchall()]
    conn.close()
    for row in rows:
        row["export_formats"] = [f for f in (row["export_formats"] or "").split(",") if f]
    return rows


def count_reports():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    conn.close()
    return count


def get_report(report_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    if not row:
        return None
    report = dict(row)
    report["export_formats"] = [f for f in (report["export_formats"] or "").split(",") if f]
    return report


def report_code_taken(code: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM reports WHERE id = ? AND id != ?", (code, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM reports WHERE id = ?", (code,)).fetchone()
    conn.close()
    return row is not None


def report_title_taken(title: str, exclude_id: str | None = None):
    conn = get_connection()
    if exclude_id is not None:
        row = conn.execute("SELECT 1 FROM reports WHERE title = ? AND id != ?", (title, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM reports WHERE title = ?", (title,)).fetchone()
    conn.close()
    return row is not None


def create_report(id: str, title: str, purpose: str | None, content: str | None, export_formats: list[str]):
    conn = get_connection()
    conn.execute(
        "INSERT INTO reports (id, title, purpose, content, export_formats, report_type) VALUES (?, ?, ?, ?, ?, NULL)",
        (id, title, purpose, content, ",".join(export_formats)),
    )
    conn.commit()
    conn.close()
    return get_report(id)


def update_report(
    original_id: str, id: str, title: str, purpose: str | None, content: str | None, export_formats: list[str]
):
    conn = get_connection()
    conn.execute(
        "UPDATE reports SET id = ?, title = ?, purpose = ?, content = ?, export_formats = ? WHERE id = ?",
        (id, title, purpose, content, ",".join(export_formats), original_id),
    )
    conn.commit()
    conn.close()
    return get_report(id)


def get_rating_summary_rows():
    """Real data backing RPT-002 (דו"ח סיכום דירוגים): every ranking with its
    current model/team/status/rating, straight from the rankings table."""
    rows = get_all_rankings()
    return [
        {
            "code": r["code"],
            "subject": r["subject"],
            "model": r["model"],
            "team": r["team"],
            "status": r["status"],
            "computed_rating": r["computed_rating"] or "-",
            "final_rating": r["final_rating"] or "-",
        }
        for r in rows
    ]


def get_rating_expiry_rows():
    """Real data backing RPT-005 (דו"ח תוקף דירוגים): every בתוקף ranking with
    its days-until-expiry and an urgency bucket, sorted most-urgent first."""
    today = date.today()
    rows = get_all_rankings()
    out = []
    for r in rows:
        if r["status"] != "בתוקף" or not r["valid_until"]:
            continue
        valid_until = datetime.strptime(r["valid_until"], "%d/%m/%Y").date()
        days_left = (valid_until - today).days
        if days_left <= 0:
            urgency = "פג תוקף"
        elif days_left <= 30:
            urgency = "דחוף (30 יום)"
        elif days_left <= 60:
            urgency = "בקרוב (60 יום)"
        elif days_left <= 90:
            urgency = "קרב (90 יום)"
        else:
            urgency = "תקין"
        out.append(
            {
                "code": r["code"],
                "subject": r["subject"],
                "model": r["model"],
                "valid_until": r["valid_until"],
                "days_left": days_left,
                "urgency": urgency,
            }
        )
    out.sort(key=lambda x: x["days_left"])
    return out


def get_rating_distribution():
    """Real data backing RPT-006 (דו"ח התפלגות דירוגים): rating and model
    counts across every ranking, computed from the rankings table."""
    rows = get_all_rankings()
    by_rating: dict[str, int] = {}
    by_model: dict[str, int] = {}
    for r in rows:
        rating = r["final_rating"] or r["computed_rating"]
        if rating:
            by_rating[rating] = by_rating.get(rating, 0) + 1
        if r["model"]:
            by_model[r["model"]] = by_model.get(r["model"], 0) + 1
    return {"by_rating": by_rating, "by_model": by_model}


def _questionnaire_groups_for_model(conn, model_id: str):
    """The questionnaire groups (and their weights) assigned to a model —
    real structural data, standing in for RPT-001's 'ציוני קבוצות שאלונים'
    since the system doesn't store per-ranking submitted answers/scores."""
    if not model_id:
        return []
    rows = conn.execute(
        """
        SELECT q.name, mq.weight FROM model_questionnaires mq
        JOIN questionnaires q ON q.id = mq.questionnaire_id
        WHERE mq.model_id = ? ORDER BY mq.position ASC
        """,
        (model_id,),
    ).fetchall()
    return [{"name": r["name"], "weight": r["weight"]} for r in rows]


def get_entity_rating_detail(
    kind: str, entity_id: str, date_from: str | None = None, date_to: str | None = None
):
    """Real data backing RPT-001 (per-entity detail) and RPT-003 (compare
    over time) for a selected מנפיק/נכס: the entity's own details plus
    every ranking process where it's the framework being rated, each with
    its model's questionnaire-group weights. Returns None if the entity
    itself isn't found. Approval-history and audit-trail data aren't
    modeled anywhere in the system yet, so callers should treat their
    absence as "not available" rather than synthesize it.

    date_from/date_to (ISO yyyy-mm-dd) restrict the result to rankings
    approved within that window — RPT-003's time-frame selection. Rankings
    with no approval_date (drafts/in-progress) have no point in time to
    place on that timeline, so a date filter excludes them; leaving both
    unset returns every matching ranking regardless of approval status."""
    if kind == "מנפיק":
        entity = get_issuer(entity_id)
    elif kind == "נכס":
        entity = get_asset(entity_id)
    else:
        return None
    if not entity:
        return None

    conn = get_connection()
    all_rows = get_all_rankings()
    matches = [
        r
        for r in all_rows
        if (kind == "מנפיק" and r["framework_issuer_id"] == entity_id)
        or (kind == "נכס" and r["framework_asset_id"] == entity_id)
    ]
    if date_from or date_to:
        matches = [
            r
            for r in matches
            if r["approval_date"]
            and (not date_from or r["approval_date"] >= date_from)
            and (not date_to or r["approval_date"] <= date_to)
        ]
    rankings = []
    for r in matches:
        rankings.append(
            {
                "id": r["id"],
                "code": r["code"],
                "subject": r["subject"],
                "model": r["model"],
                "team": r["team"],
                "status": r["status"],
                "computed_score": r["computed_score"],
                "computed_rating": r["computed_rating"],
                "final_score": r["final_score"],
                "final_rating": r["final_rating"],
                "approval_date": r["approval_date"],
                "valid_from": r["valid_from"],
                "valid_until": r["valid_until"],
                "questionnaire_groups": _questionnaire_groups_for_model(conn, r["model_id"]),
            }
        )
    conn.close()
    rankings.sort(key=lambda r: (r["approval_date"] or "", r["id"]))
    return {"entity_kind": kind, "entity": entity, "rankings": rankings}


def get_all_notification_types():
    conn = get_connection()
    rows = [dict(r) for r in conn.execute("SELECT * FROM notification_types ORDER BY rowid ASC").fetchall()]
    conn.close()
    for row in rows:
        row["channels"] = [c for c in (row["channels"] or "").split(",") if c]
    return rows


def get_notification_type(type_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM notification_types WHERE id = ?", (type_id,)).fetchone()
    conn.close()
    if not row:
        return None
    t = dict(row)
    t["channels"] = [c for c in (t["channels"] or "").split(",") if c]
    return t


def update_notification_type_email(type_id: str, notification_email: str | None):
    conn = get_connection()
    conn.execute(
        "UPDATE notification_types SET notification_email = ? WHERE id = ?", (notification_email, type_id)
    )
    conn.commit()
    conn.close()
    return get_notification_type(type_id)


def _create_notification(type_id: str, entity_id: str | None, message: str):
    """Logs a real notification event to the יומן ביקורת, and — for types
    whose channel includes email and that have a notification_email
    configured — actually sends it via SMTP (see email_sender.py).
    email_status records what really happened: 'sent', 'failed' (with
    email_error set), or 'not_configured' (email channel wanted but no
    address set, or no SMTP_* env vars configured)."""
    conn = get_connection()
    ntype = conn.execute("SELECT * FROM notification_types WHERE id = ?", (type_id,)).fetchone()
    email_to = None
    email_status = None
    email_error = None
    if ntype and "email" in (ntype["channels"] or "").split(","):
        email_to = ntype["notification_email"]
        if email_to:
            sent, email_status, email_error = email_sender.send_email(
                email_to, f"התראה: {ntype['name']}", message
            )
        else:
            email_status = "not_configured"
    conn.execute(
        "INSERT INTO notifications "
        "(notification_type_id, entity_id, message, created_at, email_sent_to, email_status, email_error) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            type_id, entity_id, message, datetime.now().isoformat(timespec="seconds"),
            email_to, email_status, email_error,
        ),
    )
    conn.commit()
    conn.close()


def _notification_already_logged_today(conn, type_id: str, entity_id: str):
    today = date.today().isoformat()
    row = conn.execute(
        "SELECT 1 FROM notifications WHERE notification_type_id = ? AND entity_id = ? AND substr(created_at, 1, 10) = ?",
        (type_id, entity_id, today),
    ).fetchone()
    return row is not None


def refresh_expiry_notifications():
    """Simulates the RATING_EXPIRING_30D/RATING_EXPIRED types' "יומי (06:00)"
    schedule: there's no real cron here, so this scans for matches and logs
    any that aren't already logged for today, called lazily whenever the
    notification log is fetched."""
    conn = get_connection()
    rows = get_all_rankings()
    for r in rows:
        if r["status"] != "בתוקף" or not r["valid_until"]:
            continue
        valid_until = datetime.strptime(r["valid_until"], "%d/%m/%Y").date()
        days_left = (valid_until - date.today()).days
        if days_left < 0:
            type_id = "RATING_EXPIRED"
            msg = f"תוקף הדירוג של {r['subject']} ({r['code']}) פג ב-{r['valid_until']}"
        elif days_left <= 30:
            type_id = "RATING_EXPIRING_30D"
            msg = f"תוקף הדירוג של {r['subject']} ({r['code']}) יפוג בעוד {days_left} ימים ({r['valid_until']})"
        else:
            continue
        if not _notification_already_logged_today(conn, type_id, r["id"]):
            conn.close()
            _create_notification(type_id, r["id"], msg)
            conn = get_connection()
    conn.close()


def get_all_notifications():
    conn = get_connection()
    rows = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC, id DESC"
        ).fetchall()
    ]
    types_by_id = {t["id"]: t for t in conn.execute("SELECT * FROM notification_types").fetchall()}
    conn.close()
    for row in rows:
        ntype = types_by_id.get(row["notification_type_id"])
        row["type_name"] = ntype["name"] if ntype else row["notification_type_id"]
        row["channels"] = [c for c in (ntype["channels"] or "").split(",") if c] if ntype else []
    return rows


def count_notifications():
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM notifications").fetchone()[0]
    conn.close()
    return count
