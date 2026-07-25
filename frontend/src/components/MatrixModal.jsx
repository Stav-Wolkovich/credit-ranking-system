import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const TYPE_OPTIONS = ["רשת 2D", "רשת תלת-ממדית"];

function Field({ label, required, value, onChange, type = "text" }) {
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

export default function MatrixModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    type: initial?.type ?? TYPE_OPTIONS[0],
    model_id: initial?.model_id ?? "",
    axes: initial?.axes ?? 2,
    cells: initial?.cells ?? 0,
  });
  const [models, setModels] = useState([]);
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getModels()
      .then((res) => setModels(res.rows))
      .catch((err) => setError(err.message));
  }, []);

  const title = mode === "create" ? "צור מטריצה" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const missing = new Set();
    if (!form.id.trim()) missing.add("id");
    if (!form.name.trim()) missing.add("name");
    if (!form.model_id) missing.add("model_id");
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
      type: form.type,
      model_id: form.model_id,
      axes: Number(form.axes) || 0,
      cells: Number(form.cells) || 0,
    };
    try {
      const saved =
        mode === "create" ? await api.createMatrix(payload) : await api.updateMatrix(initial.id, payload);
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

        <Field label="קוד מטריצה" required value={form.id} onChange={set("id")} />
        {fieldErrors.has("id") && (
          <div style={{ fontSize: 11.5, color: "#b52d2d", marginTop: -10, marginBottom: 10 }}>⚠ שדה חובה</div>
        )}
        <Field label="שם מטריצה" required value={form.name} onChange={set("name")} />
        {fieldErrors.has("name") && (
          <div style={{ fontSize: 11.5, color: "#b52d2d", marginTop: -10, marginBottom: 10 }}>⚠ שדה חובה</div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>סוג</div>
          <select
            value={form.type}
            onChange={set("type")}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>מודל *</div>
          <select
            value={form.model_id}
            onChange={set("model_id")}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">בחר מודל</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {fieldErrors.has("model_id") && (
            <div style={{ fontSize: 11.5, color: "#b52d2d", marginTop: 4 }}>⚠ שדה חובה</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="צירים" type="number" value={form.axes} onChange={set("axes")} />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="תאים" type="number" value={form.cells} onChange={set("cells")} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
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
