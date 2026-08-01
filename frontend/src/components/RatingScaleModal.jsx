import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function Field({ label, required, invalid, disabled, value, onChange }) {
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
        disabled={disabled}
        style={{
          width: "100%",
          border: `1px solid ${invalid ? "#e0a0a0" : "var(--border)"}`,
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

export default function RatingScaleModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
  });
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && initial?.id) {
      api
        .getRatingScale(initial.id)
        .then((full) => {
          setForm({ id: full.id, name: full.name, description: full.description ?? "" });
          setLevels(full.levels.map((lvl) => ({ ...lvl })));
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [mode, initial]);

  const title = mode === "create" ? "צור סולם דירוג" : "עריכת סולם דירוג";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function addLevel() {
    setLevels((prev) => [...prev, { label: "", min_value: 0, max_value: 0 }]);
  }

  function updateLevel(index, field, value) {
    setLevels((prev) => prev.map((lvl, i) => (i === index ? { ...lvl, [field]: value } : lvl)));
  }

  function removeLevel(index) {
    setLevels((prev) => prev.filter((_, i) => i !== index));
  }

  function moveLevel(index, direction) {
    setLevels((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
      description: form.description.trim() || null,
      levels: levels
        .filter((lvl) => lvl.label.trim())
        .map((lvl) => ({
          label: lvl.label.trim(),
          min_value: Number(lvl.min_value) || 0,
          max_value: Number(lvl.max_value) || 0,
        })),
    };
    try {
      const saved =
        mode === "create"
          ? await api.createRatingScale(payload)
          : await api.updateRatingScale(initial.id, payload);
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
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          width: 520,
          maxWidth: "90vw",
          maxHeight: "88vh",
          padding: 22,
          display: "flex",
          flexDirection: "column",
        }}
      >
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

        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>
        ) : (
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
              label="קוד סולם"
              required
              invalid={fieldErrors.has("id")}
              disabled={mode === "edit"}
              value={form.id}
              onChange={set("id")}
            />
            <Field label="שם סולם" required invalid={fieldErrors.has("name")} value={form.name} onChange={set("name")} />

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תיאור</div>
              <textarea
                value={form.description}
                onChange={set("description")}
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

            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 6 }}>דירוגים</div>
            {levels.length > 0 && (
              <div style={{ display: "flex", gap: 8, padding: "0 4px 4px", fontSize: 11.5, color: "var(--text-light)" }}>
                <div style={{ width: 34 }} />
                <div style={{ flex: 1 }}>דירוג</div>
                <div style={{ width: 90 }}>מינימום</div>
                <div style={{ width: 90 }}>מקסימום</div>
                <div style={{ width: 24 }} />
              </div>
            )}
            {levels.map((lvl, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", width: 18 }}>
                  <button
                    type="button"
                    onClick={() => moveLevel(i, -1)}
                    disabled={i === 0}
                    aria-label="הזז למעלה"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: i === 0 ? "default" : "pointer",
                      color: i === 0 ? "#c7ccd4" : "var(--text-mid)",
                      lineHeight: 1,
                      fontSize: 12,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLevel(i, 1)}
                    disabled={i === levels.length - 1}
                    aria-label="הזז למטה"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: i === levels.length - 1 ? "default" : "pointer",
                      color: i === levels.length - 1 ? "#c7ccd4" : "var(--text-mid)",
                      lineHeight: 1,
                      fontSize: 12,
                    }}
                  >
                    ▼
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="למשל AAA"
                  value={lvl.label}
                  onChange={(e) => updateLevel(i, "label", e.target.value)}
                  style={{
                    flex: 1,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "7px 10px",
                    fontSize: 13,
                  }}
                />
                <input
                  type="number"
                  step="any"
                  value={lvl.min_value}
                  onChange={(e) => updateLevel(i, "min_value", e.target.value)}
                  style={{
                    width: 90,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "7px 10px",
                    fontSize: 13,
                  }}
                />
                <input
                  type="number"
                  step="any"
                  value={lvl.max_value}
                  onChange={(e) => updateLevel(i, "max_value", e.target.value)}
                  style={{
                    width: 90,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "7px 10px",
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeLevel(i)}
                  aria-label="הסר דירוג"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
                >
                  🗑
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLevel}
              style={{
                background: "transparent",
                border: "1px dashed var(--border)",
                borderRadius: 6,
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "8px 12px",
                width: "100%",
              }}
            >
              + הוסף דירוג
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
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
            disabled={saving || loading}
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
            {saving ? "שומר…" : mode === "create" ? "צור סולם" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
