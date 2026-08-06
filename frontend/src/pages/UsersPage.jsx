import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import UserModal from "../components/UserModal.jsx";

const COLUMNS = ["שם מלא", "תפקידים", "פעיל", "פעולות"];

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};

function RolePill({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: 11.5,
        color: "var(--text-mid)",
        marginInlineEnd: 6,
        marginBottom: 4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function UsersPage() {
  const [data, setData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userModal, setUserModal] = useState(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    return api
      .getUsers()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    api
      .getRoles()
      .then((res) => setRoles(res.rows))
      .catch(() => {});
  }, []);

  const roleNameById = useMemo(() => {
    const map = {};
    roles.forEach((r) => {
      map[r.id] = r.name || r.id;
    });
    return map;
  }, [roles]);

  const rows = data?.rows ?? [];

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול משתמשים" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="חיפוש שם"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, width: 180 }}
          />
          <button
            type="button"
            onClick={() => setUserModal({ mode: "create" })}
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
            + צור משתמש
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
                  אין משתמשים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.full_name}</td>
                <td style={{ padding: "12px 16px" }}>
                  {r.role_ids.length === 0 ? (
                    "-"
                  ) : (
                    r.role_ids.map((roleId) => (
                      <RolePill key={roleId}>{roleNameById[roleId] ?? roleId}</RolePill>
                    ))
                  )}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.active ? "פעיל" : "לא פעיל"} tone={r.active ? "green" : "gray"} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setUserModal({ mode: "edit", user: r })}
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

      {userModal && (
        <UserModal
          mode={userModal.mode}
          initial={userModal.mode === "edit" ? userModal.user : null}
          onCancel={() => setUserModal(null)}
          onSaved={() => {
            setUserModal(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}
