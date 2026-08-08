import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import IssuerModal from "../components/IssuerModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "id", label: "קוד מנפיק", accessor: (r) => r.id },
  { key: "name", label: "שם מנפיק", accessor: (r) => r.name },
  { key: "type", label: "סוג", accessor: (r) => r.type },
  { key: "sector", label: "סקטור", accessor: (r) => r.sector },
  { key: "country", label: "מדינה", accessor: (r) => r.country },
  { key: "active", label: "פעיל", accessor: (r) => (r.active ? "פעיל" : "לא פעיל") },
  { key: "assets", label: "נכסים מקושרים", accessor: () => null, filterable: false },
  { key: "actions", label: "פעולות", accessor: () => null, filterable: false },
];

export default function IssuersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadIssuers = useCallback(() => {
    setLoading(true);
    return api
      .getIssuers()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadIssuers();
  }, [loadIssuers]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  function confirmDelete() {
    const issuer = deleteTarget;
    setDeleteTarget(null);
    api
      .deleteIssuer(issuer.id)
      .then(() => loadIssuers())
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <PageHeader title="ניהול מנפיקים" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            placeholder="חיפוש שם / קוד"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
              width: 200,
            }}
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
            + צור מנפיק
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
                  אין מנפיקים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.name}</td>
                <td style={{ padding: "12px 16px" }}>{r.type ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.sector ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.country ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.active ? "פעיל" : "לא פעיל"} tone={r.active ? "green" : "gray"} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    🔗
                  </button>
                </td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", issuer: r })}
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
        <IssuerModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.issuer : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadIssuers();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="מחיקה"
          message={`למחוק את המנפיק "${deleteTarget.name}"?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
