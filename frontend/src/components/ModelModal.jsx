import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const DOMAIN_OPTIONS = ["Corporate", "Project Finance", "Real Estate Project"];
const REQUIRED_FIELDS = ["id", "name", "family", "owner", "rating_scale_id"];

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
    rating_scale_id: initial?.rating_scale_id ?? "",
  });
  const [selected, setSelected] = useState(() =>
    (initial?.questionnaires ?? (initial?.questionnaire_ids ?? []).map((id) => ({ id, weight: 0 }))).map((q) => ({
      ...q,
    }))
  );
  const [questionnaires, setQuestionnaires] = useState([]);
  const [questionnaireSearch, setQuestionnaireSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [ratingScales, setRatingScales] = useState([]);
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getQuestionnaires()
      .then((res) => setQuestionnaires(res.rows))
      .catch((err) => setError(err.message));
    api
      .getUsers()
      .then((res) => setUsers(res.rows))
      .catch((err) => setError(err.message));
    api
      .getRatingScales()
      .then((res) => setRatingScales(res.rows))
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
    setSelected((prev) => {
      if (prev.some((q) => q.id === id)) return prev.filter((q) => q.id !== id);
      return [...prev, { id, weight: 0 }];
    });
  }

  function setWeight(id, weight) {
    setSelected((prev) => prev.map((q) => (q.id === id ? { ...q, weight } : q)));
  }

  function moveQuestionnaire(index, direction) {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeSelected(id) {
    setSelected((prev) => prev.filter((q) => q.id !== id));
  }

  const totalWeight = selected.reduce((sum, q) => sum + (Number(q.weight) || 0), 0);
  const questionnaireById = useMemo(() => {
    const map = new Map();
    questionnaires.forEach((q) => map.set(q.id, q));
    return map;
  }, [questionnaires]);

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
      questionnaires: selected.map((q) => ({ id: q.id, weight: Number(q.weight) || 0 })),
      rating_scale_id: form.rating_scale_id || null,
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
      <div style={{ background: "#fff", borderRadius: 10, width: step === 2 ? 620 : 460, maxWidth: "90vw", padding: 22 }}>
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

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>בעלים *</div>
              {fieldErrors.has("owner") && (
                <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
              )}
              <select
                value={form.owner}
                onChange={set("owner")}
                style={{
                  width: "100%",
                  border: `1px solid ${fieldErrors.has("owner") ? "#e0a0a0" : "var(--border)"}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                <option value="">–</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>סולם דירוג *</div>
              {fieldErrors.has("rating_scale_id") && (
                <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
              )}
              <select
                value={form.rating_scale_id}
                onChange={set("rating_scale_id")}
                style={{
                  width: "100%",
                  border: `1px solid ${fieldErrors.has("rating_scale_id") ? "#e0a0a0" : "var(--border)"}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                <option value="">בחר סולם דירוג</option>
                {ratingScales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

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
              סמן שאלונים קיימים לקישור למודל, קבע את סדר הצגתם ואת המשקל (%) של כל שאלון בציון הסופי.
            </div>

            {selected.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-mid)" }}>שאלונים נבחרים (לפי סדר הצגה)</div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 12,
                      background: totalWeight === 100 ? "#e3f3e6" : "#fbe9e9",
                      color: totalWeight === 100 ? "#1e7a34" : "#b52d2d",
                    }}
                  >
                    סה"כ משקל: {totalWeight}%
                  </span>
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
                  {selected.map((sel, i) => {
                    const q = questionnaireById.get(sel.id);
                    return (
                      <div
                        key={sel.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          borderBottom: i < selected.length - 1 ? "1px solid var(--border)" : "none",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <button
                            type="button"
                            onClick={() => moveQuestionnaire(i, -1)}
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
                            onClick={() => moveQuestionnaire(i, 1)}
                            disabled={i === selected.length - 1}
                            aria-label="הזז למטה"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: i === selected.length - 1 ? "default" : "pointer",
                              color: i === selected.length - 1 ? "#c7ccd4" : "var(--text-mid)",
                              lineHeight: 1,
                              fontSize: 12,
                            }}
                          >
                            ▼
                          </button>
                        </div>
                        <span style={{ color: "var(--text-light)", fontSize: 12, minWidth: 14 }}>{i + 1}</span>
                        <span style={{ fontWeight: 600, color: "var(--text-dark)", whiteSpace: "nowrap" }}>{sel.id}</span>
                        <span style={{ color: "var(--text-mid)", flex: 1 }}>{q?.description ?? ""}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={sel.weight}
                          onChange={(e) => setWeight(sel.id, Number(e.target.value))}
                          style={{
                            width: 60,
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: "6px 8px",
                            fontSize: 13,
                            textAlign: "center",
                          }}
                        />
                        <span style={{ color: "var(--text-mid)" }}>%</span>
                        <button
                          type="button"
                          onClick={() => removeSelected(sel.id)}
                          aria-label="הסר שאלון"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  <input
                    type="checkbox"
                    checked={selected.some((s) => s.id === q.id)}
                    onChange={() => toggleQuestionnaire(q.id)}
                  />
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
