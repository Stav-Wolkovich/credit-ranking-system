import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { PageHeader, ErrorBanner } from "../components/ui.jsx";
import RoleModal from "../components/RoleModal.jsx";

const PERMISSION_COLUMNS = [
  { key: "can_view", label: "צפייה" },
  { key: "can_create", label: "יצירה" },
  { key: "can_edit", label: "עריכה" },
  { key: "can_delete", label: "מחיקה" },
  { key: "can_approve", label: "אישור" },
  { key: "can_committee_approve", label: "אישור ועדה" },
  { key: "can_rerun", label: "הרצה מחדש" },
];

const COLUMNS = ["תפקיד", "קבוצת AD", "תיאור תפקיד", ...PERMISSION_COLUMNS.map((p) => p.label), "פעולות"];

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול תפקידים" />
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

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px", whiteSpace: "nowrap" }}>
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
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין תפקידים להצגה.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  {r.name_en && <div style={{ fontSize: 11.5, color: "var(--text-light)" }}>({r.name_en})</div>}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }}>{r.id}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)", maxWidth: 320 }}>{r.description ?? "-"}</td>
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
