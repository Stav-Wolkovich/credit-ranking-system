import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import QuestionnaireModal from "../components/QuestionnaireModal.jsx";
import DuplicateQuestionnaireModal from "../components/DuplicateQuestionnaireModal.jsx";

const COLUMNS = [
  "קוד שאלון",
  "שם שאלון",
  "גרסה",
  "סטטוס",
  "סוג",
  "פרמטרים",
  "שיטת חישוב",
  "נוצר",
  "נוצר ע\"י",
  "פעולות",
];

const STATUS_OPTIONS = ["פעיל", "טיוטה"];

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};

export default function QuestionnairesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadQuestionnaires = useCallback(() => {
    setLoading(true);
    return api
      .getQuestionnaires()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadQuestionnaires();
  }, [loadQuestionnaires]);

  const rows = data?.rows ?? [];

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  function confirmDelete() {
    const questionnaire = deleteTarget;
    setDeleteTarget(null);
    api
      .deleteQuestionnaire(questionnaire.id)
      .then(() => loadQuestionnaires())
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול שאלונים" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="חיפוש שם / קוד"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, width: 180 }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">הכל - סטטוס</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + צור שאלון
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && !error && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין שאלונים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.name}</td>
                <td style={{ padding: "12px 16px" }}>{r.version}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.type}</td>
                <td style={{ padding: "12px 16px" }}>{r.parameters_count}</td>
                <td style={{ padding: "12px 16px" }}>{r.calculation_method}</td>
                <td style={{ padding: "12px 16px" }}>{r.created_date}</td>
                <td style={{ padding: "12px 16px" }}>{r.created_by}</td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateTarget(r)}
                    aria-label="שכפול"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", questionnaire: r })}
                    aria-label="עריכה"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    aria-label="מחיקה"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <QuestionnaireModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.questionnaire : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadQuestionnaires();
          }}
        />
      )}

      {duplicateTarget && (
        <DuplicateQuestionnaireModal
          source={duplicateTarget}
          onCancel={() => setDuplicateTarget(null)}
          onSaved={() => {
            setDuplicateTarget(null);
            loadQuestionnaires();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="מחיקה"
          message={`למחוק את השאלון "${deleteTarget.name}"?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
