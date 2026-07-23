import React, { useState } from "react";
import { api } from "../api.js";

export default function DuplicateQuestionnaireModal({ source, onCancel, onSaved }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleDuplicate() {
    if (!id.trim() || !name.trim()) {
      setError("קוד שאלון ושם שאלון הם שדות חובה");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.duplicateQuestionnaire(source.id, { id: id.trim(), name: name.trim() });
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
      <div style={{ background: "#fff", borderRadius: 10, width: 400, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            שכפול שאלון <span>⧉</span>
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

        <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 16 }}>
          בחר קוד ושם חדשים. כל הפרמטרים והתשובות יועתקו כטיוטה (גרסה 1).
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

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>קוד שאלון חדש</div>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={`${source.id}-COPY`}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>שם שאלון חדש</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
            }}
          />
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
            onClick={handleDuplicate}
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
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⧉</span> {saving ? "משכפל…" : "שכפל"}
          </button>
        </div>
      </div>
    </div>
  );
}
