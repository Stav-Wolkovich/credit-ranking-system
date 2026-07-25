import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function Field({ label, required, disabled, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
          background: disabled ? "#f2f3f5" : "#fff",
          color: disabled ? "var(--text-light)" : "inherit",
        }}
      />
    </div>
  );
}

export default function UserModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    full_name: initial?.full_name ?? "",
    email: initial?.email ?? "",
  });
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState(() => new Set(initial?.role_ids ?? []));
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getRoles()
      .then((res) => setRoles(res.rows))
      .catch((err) => setError(err.message));
  }, []);

  const title = mode === "create" ? "צור משתמש" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function toggleRole(roleId) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function validate() {
    const missing = new Set();
    if (!form.id.trim()) missing.add("id");
    if (!form.full_name.trim()) missing.add("full_name");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      role_ids: Array.from(selectedRoleIds),
    };
    try {
      const saved =
        mode === "create" ? await api.createUser(payload) : await api.updateUser(initial.id, payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 26, 38, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, width: 420, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            {title} <span>{mode === "create" ? "➕" : "✎"}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="סגור"
            style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-mid)" }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fbe9e9",
              color: "#b52d2d",
              border: "1px solid #f3c9c9",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <Field
          label="שם משתמש"
          required
          disabled={mode === "edit"}
          value={form.id}
          onChange={set("id")}
        />
        {fieldErrors.has("id") && (
          <div style={{ fontSize: 11.5, color: "#b52d2d", marginTop: -10, marginBottom: 10 }}>⚠ שדה חובה</div>
        )}
        <Field label="שם מלא" required value={form.full_name} onChange={set("full_name")} />
        {fieldErrors.has("full_name") && (
          <div style={{ fontSize: 11.5, color: "#b52d2d", marginTop: -10, marginBottom: 10 }}>⚠ שדה חובה</div>
        )}
        <Field label="אימייל" type="email" value={form.email} onChange={set("email")} />

        <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 8 }}>תפקידים</div>
        <div style={{ marginBottom: 6 }}>
          {roles.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--text-light)" }}>אין תפקידים זמינים.</div>
          )}
          {roles.map((role) => (
            <label
              key={role.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                padding: "6px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedRoleIds.has(role.id)}
                onChange={() => toggleRole(role.id)}
              />
              {role.id}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "#fff",
              color: "var(--text-mid)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
