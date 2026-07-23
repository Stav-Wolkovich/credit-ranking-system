import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import ModelModal from "../components/ModelModal.jsx";

const COLUMNS = [
  "קוד מודל",
  "שם מודל",
  "משפחה",
  "תחום",
  "בעלים",
  "גרסה פעילה",
  "גרסאות",
  "מקטעים / שאלונים",
  "עודכן לאחרונה",
  "סטטוס",
  "פעולות",
];

const DOMAIN_OPTIONS = ["Corporate", "Project Finance", "Real Estate Project"];
const STATUS_OPTIONS = ["פעיל", "טיוטה"];

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};

export default function ModelsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (domainFilter && r.domain !== domainFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, domainFilter, statusFilter]);

  function confirmDelete() {
    const model = deleteTarget;
    setDeleteTarget(null);
    api
      .deleteModel(model.id)
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
            placeholder="חיפוש שם / קוד"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, width: 180 }}
          />
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={selectStyle}>
            <option value="">הכל - תחום</option>
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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
            + צור מודל
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
                <td style={{ padding: "12px 16px" }}>{r.owner}</td>
                <td style={{ padding: "12px 16px" }}>{r.active_version}</td>
                <td style={{ padding: "12px 16px" }}>{r.versions_count}</td>
                <td style={{ padding: "12px 16px" }}>
                  {r.segments_count}/{r.questionnaires_count}
                </td>
                <td style={{ padding: "12px 16px" }}>{r.last_updated}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", model: r })}
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
    </div>
  );
}
