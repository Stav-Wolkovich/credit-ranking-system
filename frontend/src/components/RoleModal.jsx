import React, { useState } from "react";
import { api } from "../api.js";

export default function RoleModal({ onCancel, onSaved }) {
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!id.trim()) {
      setError("קוד תפקיד הוא שדה חובה");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.createRole({ id: id.trim(), description: description.trim() || null });
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
      <div style={{ background: "#fff", borderRadius: 10, width: 380, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            צור תפקיד <span>➕</span>
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

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>קוד תפקיד *</div>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="לדוגמה: RISK_MODEL_BUILDER"
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
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תיאור</div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
