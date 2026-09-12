import React, { useState } from "react";
import { api } from "../api.js";

const PERMISSION_FIELDS = [
  { key: "can_view", label: "צפייה" },
  { key: "can_create", label: "יצירה" },
  { key: "can_edit", label: "עריכה" },
  { key: "can_delete", label: "מחיקה" },
  { key: "can_approve", label: "אישור" },
  { key: "can_committee_approve", label: "אישור ועדה" },
  { key: "can_rerun", label: "הרצה מחדש" },
  { key: "can_manage_notifications", label: "ניהול התראות" },
];

function Field({ label, required, invalid, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      {invalid && <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>}
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          border: `1px solid ${invalid ? "#e0a0a0" : "var(--border)"}`,
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
        }}
      />
    </div>
  );
}

export default function RoleModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    name_en: initial?.name_en ?? "",
    description: initial?.description ?? "",
    can_view: initial?.can_view ?? false,
    can_create: initial?.can_create ?? false,
    can_edit: initial?.can_edit ?? false,
    can_delete: initial?.can_delete ?? false,
    can_approve: initial?.can_approve ?? false,
    can_committee_approve: initial?.can_committee_approve ?? false,
    can_rerun: initial?.can_rerun ?? false,
    can_manage_notifications: initial?.can_manage_notifications ?? false,
  });
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const title = mode === "create" ? "צור תפקיד" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function togglePermission(key) {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  }

  function validate() {
    const missing = new Set();
    if (!form.id.trim()) missing.add("id");
    if (!form.name.trim()) missing.add("name");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      description: form.description.trim() || null,
      can_view: form.can_view,
      can_create: form.can_create,
      can_edit: form.can_edit,
      can_delete: form.can_delete,
      can_approve: form.can_approve,
      can_committee_approve: form.can_committee_approve,
      can_rerun: form.can_rerun,
      can_manage_notifications: form.can_manage_notifications,
    };
    try {
      const saved =
        mode === "create" ? await api.createRole(payload) : await api.updateRole(initial.id, payload);
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
      <div style={{ background: "#fff", borderRadius: 10, width: 460, maxWidth: "90vw", maxHeight: "88vh", padding: 22, display: "flex", flexDirection: "column" }}>
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

        <div style={{ overflowY: "auto", flex: 1 }}>
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
            label="קוד תפקיד / קבוצת AD"
            required
            invalid={fieldErrors.has("id")}
            value={form.id}
            onChange={set("id")}
          />
          <Field
            label="שם תפקיד (עברית)"
            required
            invalid={fieldErrors.has("name")}
            value={form.name}
            onChange={set("name")}
          />
          <Field label="שם באנגלית" value={form.name_en} onChange={set("name_en")} />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תיאור תפקיד</div>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "9px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 8 }}>הרשאות</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
            {PERMISSION_FIELDS.map((p) => (
              <label
                key={p.key}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 0", cursor: "pointer" }}
              >
                <input type="checkbox" checked={form[p.key]} onChange={() => togglePermission(p.key)} />
                {p.label}
              </label>
            ))}
          </div>
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
