import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const DOMAIN_OPTIONS = ["Corporate", "Project Finance", "Real Estate Project"];
const REQUIRED_FIELDS = ["id", "name", "family", "owner"];

function StepBadge({ n, active }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: active ? "var(--accent)" : "#c7ccd4",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {n}
    </span>
  );
}

function Field({ label, required, invalid, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      {invalid && (
        <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
      )}
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

export default function ModelModal({ mode, initial, onCancel, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    family: initial?.family ?? "",
    domain: initial?.domain ?? DOMAIN_OPTIONS[0],
    owner: initial?.owner ?? "",
    description: initial?.description ?? "",
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set(initial?.questionnaire_ids ?? []));
  const [questionnaires, setQuestionnaires] = useState([]);
  const [questionnaireSearch, setQuestionnaireSearch] = useState("");
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getQuestionnaires()
      .then((res) => setQuestionnaires(res.rows))
      .catch((err) => setError(err.message));
  }, []);

  const title = mode === "create" ? "צור מודל" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const filteredQuestionnaires = useMemo(() => {
    const q = questionnaireSearch.trim().toLowerCase();
    if (!q) return questionnaires;
    return questionnaires.filter(
      (item) => item.id.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [questionnaires, questionnaireSearch]);

  function toggleQuestionnaire(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validateStep1() {
    const missing = new Set(REQUIRED_FIELDS.filter((f) => !form[f].trim()));
    setFieldErrors(missing);
    return missing.size === 0;
  }

  function handleNext() {
    if (!validateStep1()) return;
    setStep(2);
  }

  async function handleSave() {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      family: form.family.trim(),
      domain: form.domain,
      owner: form.owner.trim(),
      description: form.description.trim() || null,
      questionnaire_ids: Array.from(selectedIds),
    };
    try {
      const saved =
        mode === "create" ? await api.createModel(payload) : await api.updateModel(initial.id, payload);
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
      <div style={{ background: "#fff", borderRadius: 10, width: 460, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
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

        <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              borderBottom: step === 1 ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "0 0 10px",
              fontSize: 13,
              fontWeight: 600,
              color: step === 1 ? "var(--accent)" : "var(--text-mid)",
              cursor: "pointer",
            }}
          >
            <StepBadge n={1} active={step === 1} />
            מטא-דאטה
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              borderBottom: step === 2 ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "0 0 10px",
              fontSize: 13,
              fontWeight: 600,
              color: step === 2 ? "var(--accent)" : "var(--text-mid)",
              cursor: "pointer",
            }}
          >
            <StepBadge n={2} active={step === 2} />
            קישור שאלונים
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

        {step === 1 && (
          <>
            <Field label="קוד מודל" required invalid={fieldErrors.has("id")} value={form.id} onChange={set("id")} />
            <Field label="שם מודל" required invalid={fieldErrors.has("name")} value={form.name} onChange={set("name")} />
            <Field
              label="משפחה"
              required
              invalid={fieldErrors.has("family")}
              value={form.family}
              onChange={set("family")}
            />

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תחום *</div>
              <select
                value={form.domain}
                onChange={set("domain")}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <Field label="בעלים" required invalid={fieldErrors.has("owner")} value={form.owner} onChange={set("owner")} />

            <div style={{ marginBottom: 6 }}>
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
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 12 }}>
              סמן שאלונים קיימים לקישור למודל.
            </div>
            <input
              type="text"
              placeholder="חיפוש שאלון..."
              value={questionnaireSearch}
              onChange={(e) => setQuestionnaireSearch(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                marginBottom: 10,
              }}
            />
            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
              {filteredQuestionnaires.length === 0 && (
                <div style={{ padding: 14, fontSize: 13, color: "var(--text-light)", textAlign: "center" }}>
                  אין שאלונים תואמים.
                </div>
              )}
              {filteredQuestionnaires.map((q) => (
                <label
                  key={q.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleQuestionnaire(q.id)} />
                  <span style={{ fontWeight: 600, color: "var(--text-dark)", whiteSpace: "nowrap" }}>{q.id}</span>
                  <span style={{ color: "var(--text-mid)" }}>{q.description}</span>
                </label>
              ))}
            </div>
          </>
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

          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              הבא ←
            </button>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
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
                → חזרה
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
