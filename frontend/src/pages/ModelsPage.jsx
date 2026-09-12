import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import ModelModal from "../components/ModelModal.jsx";
import DuplicateModelModal from "../components/DuplicateModelModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "id", label: "קוד מודל", accessor: (r) => r.id },
  { key: "name", label: "שם מודל", accessor: (r) => r.name },
  { key: "family", label: "משפחה", accessor: (r) => r.family },
  { key: "domain", label: "תחום", accessor: (r) => r.domain },
  { key: "owner_name", label: "בעלים", accessor: (r) => r.owner_name },
  { key: "rating_scale_name", label: "סולם דירוג", accessor: (r) => r.rating_scale_name },
  { key: "active_version", label: "גרסה פעילה", accessor: (r) => r.active_version },
  { key: "versions_count", label: "גרסאות", accessor: (r) => r.versions_count },
  { key: "segments", label: "מקטעים / שאלונים", accessor: (r) => `${r.segments_count}/${r.questionnaires_count}` },
  { key: "last_updated", label: "עודכן לאחרונה", accessor: (r) => r.last_updated },
  { key: "status", label: "סטטוס", accessor: (r) => r.status },
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

export default function ModelsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);

  const loadModels = useCallback(() => {
    setLoading(true);
    return api
      .getModels()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  function confirmDelete() {
    const model = deleteTarget;
    setDeleteTarget(null);
    api
      .deleteModel(model.id)
      .then(() => loadModels())
      .catch((err) => setError(err.message));
  }

  function handleEdit(model) {
    setModal({ mode: "edit", model });
  }

  function toggleStatus(model) {
    const nextStatus = model.status === "פעיל" ? "טיוטה" : "פעיל";
    api
      .updateModelStatus(model.id, { status: nextStatus, tone: STATUS_TONE[nextStatus] })
      .then(() => loadModels())
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול מודלים" />
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
            + צור מודל
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
                  אין מודלים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.name}</td>
                <td style={{ padding: "12px 16px" }}>{r.family}</td>
                <td style={{ padding: "12px 16px" }}>{r.domain}</td>
                <td style={{ padding: "12px 16px" }}>{r.owner_name}</td>
                <td style={{ padding: "12px 16px" }}>{r.rating_scale_name ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.active_version}</td>
                <td style={{ padding: "12px 16px" }}>{r.versions_count}</td>
                <td style={{ padding: "12px 16px" }}>
                  {r.segments_count}/{r.questionnaires_count}
                </td>
                <td style={{ padding: "12px 16px" }}>{r.last_updated}</td>
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
                    onClick={() => handleEdit(r)}
                    aria-label={r.status === "פעיל" ? "צפייה" : "עריכה"}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    {r.status === "פעיל" ? "👁" : "✎"}
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
        <ModelModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.model : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadModels();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="מחיקה"
          message={`למחוק את המודל "${deleteTarget.name}"?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {duplicateTarget && (
        <DuplicateModelModal
          source={duplicateTarget}
          onCancel={() => setDuplicateTarget(null)}
          onSaved={() => {
            setDuplicateTarget(null);
            loadModels();
          }}
        />
      )}
    </div>
  );
}
