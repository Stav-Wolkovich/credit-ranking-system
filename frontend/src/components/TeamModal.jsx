import React, { useState } from "react";
import { api } from "../api.js";

const PROCESS_KIND_OPTIONS = ["FULL", "LITE"];

function Field({ label, required, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
        }}
      />
    </div>
  );
}

export default function TeamModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    type: initial?.type ?? "",
    process_kind: initial?.process_kind ?? (mode === "create" ? PROCESS_KIND_OPTIONS[0] : ""),
    committee_submission: initial?.committee_submission ?? false,
    validity_tracking: initial?.validity_tracking ?? false,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const title = mode === "create" ? "צור צוות" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setChecked = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  async function handleSave() {
    if (!form.id.trim() || !form.name.trim()) {
      setError("קוד צוות ושם צוות הם שדות חובה");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      type: form.type.trim() || null,
      process_kind: form.process_kind || null,
      committee_submission: form.committee_submission,
      validity_tracking: form.validity_tracking,
    };
    try {
      const saved = mode === "create" ? await api.createTeam(payload) : await api.updateTeam(initial.id, payload);
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

        <Field label="קוד צוות" required value={form.id} onChange={set("id")} />
        <Field label="שם צוות" required value={form.name} onChange={set("name")} />
        <Field label="סוג" value={form.type} onChange={set("type")} />

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>סוג תהליך</div>
          <select
            value={form.process_kind}
            onChange={set("process_kind")}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">–</option>
            {PROCESS_KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.committee_submission} onChange={setChecked("committee_submission")} />
          הגשה לוועדה
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.validity_tracking} onChange={setChecked("validity_tracking")} />
          מעקב תוקף
        </label>

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
            {saving ? "שומר…" : mode === "create" ? "צור צוות" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
