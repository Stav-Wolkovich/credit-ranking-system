import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { PageHeader, ErrorBanner } from "../components/ui.jsx";
import RoleModal from "../components/RoleModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const PERMISSION_COLUMNS = [
  { key: "can_view", label: "צפייה" },
  { key: "can_create", label: "יצירה" },
  { key: "can_edit", label: "עריכה" },
  { key: "can_delete", label: "מחיקה" },
  { key: "can_approve", label: "אישור" },
  { key: "can_committee_approve", label: "אישור ועדה" },
  { key: "can_rerun", label: "הרצה מחדש" },
];

const COLUMNS = [
  { key: "name", label: "תפקיד", accessor: (r) => r.name },
  { key: "id", label: "קבוצת AD", accessor: (r) => r.id },
  { key: "description", label: "תיאור תפקיד", accessor: (r) => r.description },
  ...PERMISSION_COLUMNS.map((p) => ({ key: p.key, label: p.label, accessor: (r) => (r[p.key] ? "✓" : "—") })),
  { key: "actions", label: "פעולות", accessor: () => null, filterable: false },
];

const COLUMN_WIDTHS = [170, 150, 300, ...PERMISSION_COLUMNS.map(() => 90), 70];

function PermissionMark({ granted }) {
  return (
    <span style={{ color: granted ? "#1e7e3c" : "var(--text-light)", fontWeight: granted ? 700 : 400 }}>
      {granted ? "✓" : "—"}
    </span>
  );
}

export default function RolesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadRoles = useCallback(() => {
    setLoading(true);
    return api
      .getRoles()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול תפקידים" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            placeholder="חיפוש חופשי..."
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
            + צור תפקיד
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: 1100 }}>
          <colgroup>
            {COLUMN_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <FilterableTableHead
            columns={COLUMNS}
            filterState={filterState}
          />
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
                  אין תפקידים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", overflowWrap: "break-word" }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  {r.name_en && <div style={{ fontSize: 11.5, color: "var(--text-light)" }}>({r.name_en})</div>}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)", overflowWrap: "break-word" }}>{r.id}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)", overflowWrap: "break-word", whiteSpace: "normal" }}>{r.description ?? "-"}</td>
                {PERMISSION_COLUMNS.map((p) => (
                  <td key={p.key} style={{ padding: "12px 16px", textAlign: "center" }}>
                    <PermissionMark granted={r[p.key]} />
                  </td>
                ))}
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", role: r })}
                    aria-label="עריכה"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <RoleModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.role : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadRoles();
          }}
        />
      )}
    </div>
  );
}
