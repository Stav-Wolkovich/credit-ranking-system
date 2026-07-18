import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const CALCULATION_METHOD_OPTIONS = ["ממוצע משוקלל", "סכום", "מטריצה", "מקסימום"];
const PARAMETER_TYPE_OPTIONS = ["סובייקטיבי", "אובייקטיבי"];

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

function ParameterEditor({ parameter, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  function set(field, value) {
    onChange({ ...parameter, [field]: value });
  }

  function updateAnswer(i, text) {
    const answers = [...parameter.answers];
    answers[i] = text;
    set("answers", answers);
  }

  function removeAnswer(i) {
    set(
      "answers",
      parameter.answers.filter((_, idx) => idx !== i)
    );
  }

  function addAnswer() {
    set("answers", [...parameter.answers, ""]);
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "#eceef1",
              color: "var(--text-mid)",
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {parameter.weight}% {parameter.type}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)" }}>
            {parameter.name || "(ללא שם)"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={onRemove}
            aria-label="הסר פרמטר"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
          >
            🗑
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="הרחב"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
          >
            {expanded ? "⌃" : "⌄"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)" }}>
          <div style={{ marginTop: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>סוג פרמטר</div>
            <select
              value={parameter.type}
              onChange={(e) => set("type", e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                background: "#fff",
              }}
            >
              {PARAMETER_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>משקל (%)</div>
            <input
              type="number"
              value={parameter.weight}
              onChange={(e) => set("weight", Number(e.target.value))}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>שם פרמטר</div>
            <input
              type="text"
              value={parameter.name}
              onChange={(e) => set("name", e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
          </div>

          {parameter.type === "סובייקטיבי" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>תשובות</div>
              {parameter.answers.map((answer, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => removeAnswer(i)}
                    aria-label="הסר תשובה"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
                  >
                    ✕
                  </button>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => updateAnswer(i, e.target.value)}
                    style={{
                      flex: 1,
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-light)", minWidth: 16, textAlign: "center" }}>
                    {i + 1}
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={addAnswer}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                + הוסף תשובה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionnaireModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    calculation_method: initial?.calculation_method ?? CALCULATION_METHOD_OPTIONS[0],
    description: initial?.description ?? "",
  });
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && initial?.id) {
      api
        .getQuestionnaire(initial.id)
        .then((full) => {
          setForm({
            id: full.id,
            name: full.name,
            calculation_method: full.calculation_method,
            description: full.description ?? "",
          });
          setParameters(full.parameters.map((p) => ({ ...p, answers: [...p.answers] })));
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [mode, initial]);

  const title = mode === "create" ? "צור שאלון" : "עריכת שאלון";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function addParameter() {
    setParameters((prev) => [...prev, { name: "", type: "סובייקטיבי", weight: 0, answers: [] }]);
  }

  function updateParameter(index, next) {
    setParameters((prev) => prev.map((p, i) => (i === index ? next : p)));
  }

  function removeParameter(index) {
    setParameters((prev) => prev.filter((_, i) => i !== index));
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
      calculation_method: form.calculation_method,
      description: form.description.trim() || null,
      parameters: parameters.map((p) => ({
        name: p.name.trim(),
        type: p.type,
        weight: Number(p.weight) || 0,
        answers: p.answers.map((a) => a.trim()).filter(Boolean),
      })),
    };
    try {
      const saved =
        mode === "create"
          ? await api.createQuestionnaire(payload)
          : await api.updateQuestionnaire(initial.id, payload);
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
          width: 460,
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
              label="קוד שאלון"
              required
              invalid={fieldErrors.has("id")}
              disabled={mode === "edit"}
              value={form.id}
              onChange={set("id")}
            />
            <Field label="שם שאלון" required invalid={fieldErrors.has("name")} value={form.name} onChange={set("name")} />

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>שיטת חישוב</div>
              <select
                value={form.calculation_method}
                onChange={set("calculation_method")}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                {CALCULATION_METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תיאור</div>
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

            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 6 }}>פרמטרים</div>
            {parameters.map((p, i) => (
              <ParameterEditor
                key={i}
                parameter={p}
                onChange={(next) => updateParameter(i, next)}
                onRemove={() => removeParameter(i)}
              />
            ))}
            <button
              type="button"
              onClick={addParameter}
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
              + הוסף פרמטר
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
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
