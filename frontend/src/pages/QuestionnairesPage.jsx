import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import QuestionnaireModal from "../components/QuestionnaireModal.jsx";
import DuplicateQuestionnaireModal from "../components/DuplicateQuestionnaireModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "id", label: "קוד שאלון", accessor: (r) => r.id },
  { key: "name", label: "שם שאלון", accessor: (r) => r.name },
  { key: "version", label: "גרסה", accessor: (r) => r.version },
  { key: "status", label: "סטטוס", accessor: (r) => r.status },
  { key: "type", label: "סוג", accessor: (r) => r.type },
  { key: "parameters_count", label: "פרמטרים", accessor: (r) => r.parameters_count },
  { key: "calculation_method", label: "שיטת חישוב", accessor: (r) => r.calculation_method },
  { key: "created_date", label: "נוצר", accessor: (r) => r.created_date },
  { key: "created_by_name", label: "נוצר ע\"י", accessor: (r) => r.created_by_name },
  { key: "actions", label: "פעולות", accessor: () => null, filterable: false },
];

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};

const STATUS_TONE = { "טיוטה": "gray", "פעיל": "green" };

export default function QuestionnairesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  function confirmDelete() {
    const questionnaire = deleteTarget;
    setDeleteTarget(null);
    api
      .deleteQuestionnaire(questionnaire.id)
      .then(() => loadQuestionnaires())
      .catch((err) => setError(err.message));
  }

  function toggleStatus(questionnaire) {
    const nextStatus = questionnaire.status === "פעיל" ? "טיוטה" : "פעיל";
    api
      .updateQuestionnaireStatus(questionnaire.id, { status: nextStatus, tone: STATUS_TONE[nextStatus] })
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
            placeholder="חיפוש חופשי..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, width: 180 }}
          />
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
          <FilterableTableHead columns={COLUMNS} filterState={filterState} />
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge label={r.status} tone={r.tone} />
                    <button
                      type="button"
                      onClick={() => toggleStatus(r)}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                        color: "var(--text-mid)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.status === "פעיל" ? "החזר לטיוטה" : "הפוך לפעיל"}
                    </button>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>{r.type}</td>
                <td style={{ padding: "12px 16px" }}>{r.parameters_count}</td>
                <td style={{ padding: "12px 16px" }}>{r.calculation_method}</td>
                <td style={{ padding: "12px 16px" }}>{r.created_date}</td>
                <td style={{ padding: "12px 16px" }}>{r.created_by_name}</td>
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
