import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Badge, ConfirmDialog } from "./ui.jsx";

const PROCESS_TERMINAL_STATUSES = new Set(["בוטל", "אושר בוועדה", "בתוקף"]);

function isParameterAnswered(p) {
  const a = p.current_answer;
  if (!a) return false;
  if (p.type === "מטריצה") return a.matrix_x != null && a.matrix_y != null;
  return a.answer_id != null || a.numeric_value != null;
}

function rangeLabel(a) {
  if (a.min_value == null && a.max_value == null) return null;
  return `${a.min_value ?? "-"}–${a.max_value ?? "-"}`;
}

function countAnswered(questionnaires) {
  let total = 0;
  let answered = 0;
  questionnaires.forEach((q) => {
    q.parameters.forEach((p) => {
      total += 1;
      if (isParameterAnswered(p)) answered += 1;
    });
  });
  return { total, answered };
}

function matrixCellScore(matrix, x, y) {
  if (!matrix || !matrix.cell_values || x == null || y == null) return null;
  const xIndex = matrix.x_values.indexOf(x);
  const yIndex = matrix.y_values.indexOf(y);
  if (xIndex === -1 || yIndex === -1) return null;
  return matrix.cell_values[yIndex]?.[xIndex] ?? null;
}

function ParameterField({ parameter, onAnswer, saving }) {
  const isSubjective = parameter.type === "סובייקטיבי";
  const isQuant = parameter.type === "כמותי";
  const isChoiceList = isSubjective || isQuant;
  const isMatrix = parameter.type === "מטריצה";
  const [numericDraft, setNumericDraft] = useState(
    parameter.current_answer?.numeric_value ?? ""
  );
  const [matrixX, setMatrixX] = useState(parameter.current_answer?.matrix_x ?? "");
  const [matrixY, setMatrixY] = useState(parameter.current_answer?.matrix_y ?? "");

  function handleMatrixChange(nextX, nextY) {
    setMatrixX(nextX);
    setMatrixY(nextY);
    if (nextX && nextY) onAnswer({ matrix_x: nextX, matrix_y: nextY });
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{parameter.name}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>משקל {parameter.weight}%</span>
      </div>

      {isChoiceList ? (
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
              {isQuant && rangeLabel(a) && (
                <span style={{ color: "var(--text-light)", fontSize: 11 }} dir="ltr">
                  {rangeLabel(a)}
                </span>
              )}
              <span style={{ color: "var(--text-light)", fontSize: 11 }} dir="ltr">
                ציון: {a.score}
              </span>
            </label>
          ))}
        </div>
      ) : isMatrix ? (
        <div>
          {!parameter.matrix ? (
            <div style={{ fontSize: 12.5, color: "var(--text-light)" }}>למטריצה של פרמטר זה אין רשת ערכים.</div>
          ) : (
            <div style={{ overflowX: "auto" }} dir="ltr">
              <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "1px solid var(--border)",
                        padding: "6px 10px",
                        background: "#f2f3f5",
                        fontSize: 10.5,
                        color: "var(--text-mid)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div>{parameter.matrix.x_axis_label || "ציר X"} →</div>
                      <div>{parameter.matrix.y_axis_label || "ציר Y"} ↓</div>
                    </th>
                    {parameter.matrix.x_values.map((x) => (
                      <th
                        key={x}
                        style={{
                          border: "1px solid var(--border)",
                          padding: "6px 10px",
                          background: "#f2f3f5",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parameter.matrix.y_values.map((y, yi) => (
                    <tr key={y}>
                      <th
                        style={{
                          border: "1px solid var(--border)",
                          padding: "6px 10px",
                          background: "#f2f3f5",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {y}
                      </th>
                      {parameter.matrix.x_values.map((x, xi) => {
                        const selected = matrixX === x && matrixY === y;
                        return (
                          <td
                            key={x}
                            onClick={() => !saving && handleMatrixChange(x, y)}
                            style={{
                              border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                              padding: "6px 10px",
                              textAlign: "center",
                              background: selected ? "#e8f0fe" : "#fff",
                              color: selected ? "var(--accent)" : "var(--text-dark)",
                              fontWeight: selected ? 700 : 400,
                              cursor: saving ? "default" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {parameter.matrix.cell_values[yi]?.[xi]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {matrixX && matrixY && (
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 6 }}>
                  {matrixY} / {matrixX} — ציון: {matrixCellScore(parameter.matrix, matrixX, matrixY) ?? "-"}
                </div>
              )}
            </div>
          )}
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

const STATUS_ACTION_BUTTON_STYLE = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: "#fff",
  whiteSpace: "nowrap",
};

export default function ProcessScoringModal({ process, onCancel, onUpdated }) {
  const [structure, setStructure] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    api
      .getProcessScoring(process.id)
      .then((s) => {
        setStructure(s);
        const { total, answered } = countAnswered(s.questionnaires);
        setResult({
          completion: total ? Math.round((answered / total) * 100) : 0,
          complete: total > 0 && answered === total,
          score: process.computed_score ?? null,
          rating: process.computed_rating ?? null,
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

  async function runStatusAction(action) {
    setStatusAction(action);
    setError(null);
    try {
      await api.applyProcessStatusAction(process.id, action);
      onCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusAction(null);
    }
  }

  const isTerminal = PROCESS_TERMINAL_STATUSES.has(process.status);
  const busy = saving || statusAction !== null;

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
      <div style={{ background: "#fff", borderRadius: 10, width: 820, maxWidth: "96vw", maxHeight: "90vh", padding: 22, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            מילוי שאלונים ודירוג <span>📝</span>
            <Badge label={process.status} tone={process.tone} />
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
          <div style={{ display: "flex", gap: 18, overflow: "hidden", flex: 1 }}>
            <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mid)", marginBottom: 4 }}>
                  <span>
                    {progress.answered}/{progress.total}
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

              <div
                style={{
                  border: `1px solid ${result?.complete ? "#b9e2c4" : "var(--border)"}`,
                  background: result?.complete ? "#e5f5ea" : "#f7f8fa",
                  borderRadius: 8,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11.5, color: "var(--text-mid)", marginBottom: 4 }}>ציון מחושב</div>
                {result?.score != null ? (
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }} dir="ltr">
                    <span style={{ fontSize: 22, fontWeight: 700, color: result?.complete ? "#1e7e3c" : "var(--text-dark)" }}>
                      {result.rating ?? "-"}
                    </span>
                    <span style={{ fontSize: 15, color: "var(--text-mid)" }}>{result.score}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-light)" }}>אין עדיין תשובות</div>
                )}
                {result?.complete && (
                  <div style={{ fontSize: 11, color: "#1e7e3c", marginTop: 4, fontWeight: 600 }}>✓ הדירוג הושלם</div>
                )}
              </div>

              {process.rejection_comment && (
                <div
                  style={{
                    border: "1px solid #f3c9c9",
                    background: "#fbe9e9",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#b52d2d", fontWeight: 700, marginBottom: 4 }}>
                    {process.status === "הוחזר" ? "הערת החזרה ממנהל" : "הערת דחייה מוועדה"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-dark)" }}>{process.rejection_comment}</div>
                </div>
              )}

              {process.final_rating && (
                <div
                  style={{
                    border: `1px solid ${process.status === "נדחה בועדה" ? "#e0a0a0" : "var(--border)"}`,
                    background: process.status === "נדחה בועדה" ? "#fbe9e9" : "#f7f8fa",
                    borderRadius: 8,
                    padding: "10px 14px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--text-mid)", marginBottom: 4 }}>דירוג סופי</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }} dir="ltr">
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: process.status === "נדחה בועדה" ? "#b52d2d" : "var(--text-dark)",
                      }}
                    >
                      {process.final_rating}
                    </span>
                    {process.final_score != null && (
                      <span style={{ fontSize: 13, color: "var(--text-mid)" }}>{process.final_score}</span>
                    )}
                  </div>
                  {process.status === "נדחה בועדה" && (
                    <div style={{ fontSize: 11, color: "#b52d2d", marginTop: 4, fontWeight: 600 }}>
                      ✕ נדחה על ידי הוועדה — שונה מהדירוג המחושב
                    </div>
                  )}
                </div>
              )}

              {structure.rating_scale_levels?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mid)", marginBottom: 6 }}>
                    {structure.rating_scale_name ?? "סולם דירוג"}
                  </div>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                    {structure.rating_scale_levels.map((lvl, i) => {
                      const isCurrent =
                        result?.score != null && result.score >= lvl.min_value && result.score < lvl.max_value;
                      return (
                        <div
                          key={lvl.label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "5px 8px",
                            fontSize: 11.5,
                            background: isCurrent ? "#e8f0fe" : "transparent",
                            color: isCurrent ? "#1a56c4" : "var(--text-mid)",
                            fontWeight: isCurrent ? 700 : 400,
                            borderTop: i > 0 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          <span>{lvl.label}</span>
                          <span dir="ltr">
                            {lvl.min_value}–{lvl.max_value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...STATUS_ACTION_BUTTON_STYLE, color: "var(--text-mid)" }}
          >
            שמירה כטיוטה
          </button>

          {!isTerminal && (
            <>
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
                style={{ ...STATUS_ACTION_BUTTON_STYLE, color: "#b52d2d", opacity: busy ? 0.7 : 1 }}
              >
                ביטול תהליך
              </button>
              <button
                type="button"
                onClick={() => runStatusAction("pause")}
                disabled={busy}
                style={{ ...STATUS_ACTION_BUTTON_STYLE, color: "#a6650b", opacity: busy ? 0.7 : 1 }}
              >
                השהיה
              </button>
              <button
                type="button"
                onClick={() => runStatusAction("self_approve")}
                disabled={busy || !result?.complete}
                title={!result?.complete ? "יש להשלים את כל השאלונים (100%) לפני העברה לתור אישורים" : undefined}
                style={{
                  ...STATUS_ACTION_BUTTON_STYLE,
                  color: "var(--text-mid)",
                  opacity: busy || !result?.complete ? 0.5 : 1,
                  cursor: !result?.complete ? "not-allowed" : "pointer",
                }}
              >
                אישור עצמי
              </button>
              <button
                type="button"
                onClick={() => runStatusAction("submit")}
                disabled={busy || !result?.complete}
                title={!result?.complete ? "יש להשלים את כל השאלונים (100%) לפני העברה לתור אישורים" : undefined}
                style={{
                  ...STATUS_ACTION_BUTTON_STYLE,
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  opacity: busy || !result?.complete ? 0.5 : 1,
                  cursor: !result?.complete ? "not-allowed" : "pointer",
                }}
              >
                {statusAction === "submit" ? "שולח…" : "הגשה לאישור"}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="ביטול תהליך"
          message={`לבטל את התהליך ${process.id}? ניתן יהיה לצפות בו אך לא להמשיך לעבוד עליו.`}
          confirmLabel="ביטול תהליך"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            runStatusAction("cancel");
          }}
        />
      )}
    </div>
  );
}
