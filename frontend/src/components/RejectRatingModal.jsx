import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function RejectRatingModal({ process, stage, onCancel, onRejected }) {
  const isCommittee = stage === "committee";
  const [levels, setLevels] = useState([]);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(isCommittee);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isCommittee) return;
    api
      .getProcessScoring(process.id)
      .then((s) => {
        setLevels(s.rating_scale_levels ?? []);
        setRating((s.rating_scale_levels ?? [])[0]?.label ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [process.id, isCommittee]);

  async function handleReject() {
    if (isCommittee && !rating) {
      setError("יש לבחור דירוג");
      return;
    }
    if (!comment.trim()) {
      setError("יש להזין הערה");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = isCommittee
        ? await api.rejectCommitteeProcess(process.id, { final_rating: rating, comment: comment.trim() })
        : await api.rejectManagerProcess(process.id, { comment: comment.trim() });
      onRejected(updated);
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
        zIndex: 110,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, width: 420, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            דחיית דירוג <span>✕</span>
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
          {isCommittee ? (
            <>
              {process.id} · {process.code} — הדירוג המחושב יידחה והתהליך ייצא מתור האישורים בסטטוס "נדחה בועדה". יש
              לבחור דירוג סופי חלופי ולהסביר את הסיבה.
            </>
          ) : (
            <>
              {process.id} · {process.code} — התהליך יוחזר לאחראי התהליך לתיקון (סטטוס "הוחזר") וייצא מתור האישורים.
              יש להסביר מה נדרש לתקן.
            </>
          )}
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

        {isCommittee &&
          (loading ? (
            <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>
          ) : levels.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 14 }}>
              למודל של תהליך זה אין סולם דירוג מוגדר, ולכן לא ניתן לבחור דירוג חלופי.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>דירוג סופי חדש *</div>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                {levels.map((lvl) => (
                  <option key={lvl.label} value={lvl.label}>
                    {lvl.label} ({lvl.min_value}–{lvl.max_value})
                  </option>
                ))}
              </select>
            </div>
          ))}

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>הערה *</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={isCommittee ? "מדוע הדירוג המחושב נדחה?" : "מה נדרש לתקן בתהליך?"}
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
            onClick={handleReject}
            disabled={saving || loading || (isCommittee && levels.length === 0)}
            style={{
              background: "#b52d2d",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving || (isCommittee && levels.length === 0) ? 0.7 : 1,
            }}
          >
            {saving ? "דוחה…" : "✕ דחיית דירוג"}
          </button>
        </div>
      </div>
    </div>
  );
}
