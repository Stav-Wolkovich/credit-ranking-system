import React, { useState } from "react";
import { api } from "../api.js";

const EXPORT_FORMAT_OPTIONS = ["PDF", "Excel"];

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

export default function ReportModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    title: initial?.title ?? "",
    purpose: initial?.purpose ?? "",
    content: initial?.content ?? "",
  });
  const [exportFormats, setExportFormats] = useState(
    new Set(initial?.export_formats ?? EXPORT_FORMAT_OPTIONS)
  );
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const title = mode === "create" ? "צור דוח" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function toggleFormat(fmt) {
    setExportFormats((prev) => {
      const next = new Set(prev);
      if (next.has(fmt)) next.delete(fmt);
      else next.add(fmt);
      return next;
    });
  }

  function validate() {
    const missing = new Set();
    if (!form.id.trim()) missing.add("id");
    if (!form.title.trim()) missing.add("title");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      title: form.title.trim(),
      purpose: form.purpose.trim() || null,
      content: form.content.trim() || null,
      export_formats: Array.from(exportFormats),
    };
    try {
      const saved =
        mode === "create" ? await api.createReport(payload) : await api.updateReport(initial.id, payload);
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

          <Field label="קוד דוח" required invalid={fieldErrors.has("id")} value={form.id} onChange={set("id")} />
          <Field label="כותרת" required invalid={fieldErrors.has("title")} value={form.title} onChange={set("title")} />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>מטרה</div>
            <textarea
              value={form.purpose}
              onChange={set("purpose")}
              rows={2}
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

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תוכן</div>
            <textarea
              value={form.content}
              onChange={set("content")}
              rows={4}
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

          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 6 }}>אפשרויות ייצוא</div>
          <div style={{ marginBottom: 6 }}>
            {EXPORT_FORMAT_OPTIONS.map((fmt) => (
              <label
                key={fmt}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 0", cursor: "pointer" }}
              >
                <input type="checkbox" checked={exportFormats.has(fmt)} onChange={() => toggleFormat(fmt)} />
                {fmt}
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
