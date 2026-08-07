import React, { useState } from "react";
import { api } from "../api.js";
import { Badge } from "./ui.jsx";
import RejectRatingModal from "./RejectRatingModal.jsx";

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-mid)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text-dark)", fontWeight: 600 }}>{value ?? "-"}</span>
    </div>
  );
}

export default function ApprovalReviewModal({ process, stage, onCancel, onApproved }) {
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const title = stage === "manager" ? "בדיקה ואישור מנהל" : "בדיקה ואישור ועדה";
  const approveLabel = stage === "manager" ? "אישור מנהל" : "אישור ועדה";

  async function handleApprove() {
    setSaving(true);
    setError(null);
    try {
      const updated =
        stage === "manager"
          ? await api.approveManagerProcess(process.id)
          : await api.approveCommitteeProcess(process.id);
      onApproved(updated);
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
      <div style={{ background: "#fff", borderRadius: 10, width: 440, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            {title} <span>🔍</span>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{process.code}</span>
          <Badge label={process.status} tone={process.tone} />
        </div>

        <div style={{ marginTop: 8 }}>
          <Row label="מס' תהליך" value={process.id} />
          <Row label="נושא הדירוג" value={process.subject} />
          <Row label="מסגרת" value={process.framework} />
          <Row label="סוג" value={process.kind ?? (process.framework_asset_id ? "נכס" : "מנפיק")} />
          <Row label="מודל" value={process.model} />
          <Row label="צוות" value={process.team} />
          <Row label="ציון מחושב" value={process.computed_score} />
          <Row label="דירוג מחושב" value={process.computed_rating} />
          <Row label="ציון סופי" value={process.final_score} />
          <Row label="דירוג סופי" value={process.final_rating} />
          <Row label="השלמה" value={process.completion != null ? `${process.completion}%` : null} />
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
          {stage === "committee" && (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={saving}
              style={{
                background: "#fff",
                color: "#b52d2d",
                border: "1px solid #e0a0a0",
                borderRadius: 6,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              ✕ דחיית דירוג
            </button>
          )}
          <button
            type="button"
            onClick={handleApprove}
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
            {saving ? "מאשר…" : `✓ ${approveLabel}`}
          </button>
        </div>
      </div>

      {rejecting && (
        <RejectRatingModal
          process={process}
          onCancel={() => setRejecting(false)}
          onRejected={(updated) => {
            setRejecting(false);
            onApproved(updated);
          }}
        />
      )}
    </div>
  );
}
