import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function countAnswered(questionnaires) {
  let total = 0;
  let answered = 0;
  questionnaires.forEach((q) => {
    q.parameters.forEach((p) => {
      total += 1;
      if (p.current_answer && (p.current_answer.answer_id != null || p.current_answer.numeric_value != null)) {
        answered += 1;
      }
    });
  });
  return { total, answered };
}

function ParameterField({ parameter, onAnswer, saving }) {
  const isSubjective = parameter.type === "סובייקטיבי";
  const [numericDraft, setNumericDraft] = useState(
    parameter.current_answer?.numeric_value ?? ""
  );

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{parameter.name}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>משקל {parameter.weight}%</span>
      </div>

      {isSubjective ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {parameter.answers.map((a) => (
            <label
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                padding: "6px 8px",
                borderRadius: 6,
                background: parameter.current_answer?.answer_id === a.id ? "#e8f0fe" : "transparent",
                cursor: saving ? "default" : "pointer",
              }}
            >
              <input
                type="radio"
                name={`param-${parameter.id}`}
                checked={parameter.current_answer?.answer_id === a.id}
                disabled={saving}
                onChange={() => onAnswer({ answer_id: a.id })}
              />
              <span style={{ flex: 1 }}>{a.text}</span>
              <span style={{ color: "var(--text-light)", fontSize: 11 }} dir="ltr">
                ציון: {a.score}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            step="0.1"
            value={numericDraft}
            disabled={saving}
            onChange={(e) => setNumericDraft(e.target.value)}
            onBlur={() => {
              const v = numericDraft === "" ? null : Number(numericDraft);
              if (v !== null && !Number.isNaN(v)) onAnswer({ numeric_value: v });
            }}
            placeholder="ציון (0 עד 4.5, נמוך יותר = טוב יותר)"
            style={{
              width: 220,
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "7px 10px",
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>פרמטר אובייקטיבי — הזנת ציון ישירה</span>
        </div>
      )}
    </div>
  );
}

const CALC_METHOD_LABELS = { "ממוצע משוקלל": "ממוצע משוקלל", "סכום": "סכום", "מקסימום": "מקסימום" };

export default function ProcessScoringModal({ process, onCancel, onUpdated }) {
  const [structure, setStructure] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getProcessScoring(process.id)
      .then((s) => {
        setStructure(s);
        const { total, answered } = countAnswered(s.questionnaires);
        setResult({
          completion: total ? Math.round((answered / total) * 100) : 0,
          complete: false,
          score: null,
          rating: null,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [process.id]);

  const progress = useMemo(() => {
    if (!structure) return { total: 0, answered: 0 };
    return countAnswered(structure.questionnaires);
  }, [structure]);

  async function handleAnswer(parameterId, payload) {
    setSaving(true);
    setError(null);
    // Optimistic local update so the radio/number reflects the pick immediately.
    setStructure((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questionnaires: prev.questionnaires.map((q) => ({
          ...q,
          parameters: q.parameters.map((p) =>
            p.id === parameterId ? { ...p, current_answer: payload } : p
          ),
        })),
      };
    });
    try {
      const updated = await api.saveProcessAnswer(process.id, { parameter_id: parameterId, ...payload });
      setResult(updated);
      onUpdated?.(updated);
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
      <div style={{ background: "#fff", borderRadius: 10, width: 640, maxWidth: "94vw", maxHeight: "90vh", padding: 22, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            מילוי שאלונים ודירוג <span>📝</span>
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
        <div style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 14 }}>
          {process.id} · {process.code}
          {structure?.model_name && ` · ${structure.model_name}`}
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
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {loading && <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>}

        {!loading && structure && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>
                <span>
                  הושלמו {progress.answered} מתוך {progress.total} שאלות
                </span>
                <span>{result?.completion ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: "#eceef1", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${result?.completion ?? 0}%`,
                    background: result?.complete ? "#1e7e3c" : "var(--accent)",
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>

            {result?.complete && (
              <div
                style={{
                  background: "#e5f5ea",
                  border: "1px solid #b9e2c4",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "#1e7e3c", fontWeight: 600 }}>
                  ✓ הדירוג הושלם ונשמר בתהליך
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1e7e3c" }} dir="ltr">
                  {result.score} → {result.rating ?? (structure.rating_scale_id ? "-" : "אין סולם דירוג למודל")}
                </span>
              </div>
            )}

            <div style={{ overflowY: "auto", flex: 1 }}>
              {structure.questionnaires.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text-light)", padding: "16px 0" }}>
                  למודל זה אין שאלונים משויכים.
                </div>
              )}
              {structure.questionnaires.map((q) => (
                <div key={q.id} style={{ marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{q.name}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "1px 8px",
                          color: "var(--text-mid)",
                        }}
                      >
                        {CALC_METHOD_LABELS[q.calculation_method] ?? q.calculation_method}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>משקל {q.weight}%</span>
                    </div>
                  </div>
                  {q.parameters.map((p) => (
                    <ParameterField
                      key={p.id}
                      parameter={p}
                      saving={saving}
                      onAnswer={(payload) => handleAnswer(p.id, payload)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
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
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
