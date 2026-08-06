import React, { useState } from "react";
import { api } from "../api.js";

export default function NotificationTypeEmailModal({ notificationType, onCancel, onSaved }) {
  const [email, setEmail] = useState(notificationType.notification_email ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updateNotificationType(notificationType.id, {
        notification_email: email.trim() || null,
      });
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
      <div style={{ background: "#fff", borderRadius: 10, width: 420, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            הגדרת כתובת אימייל <span>✉</span>
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

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 4 }}>
          {notificationType.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 16 }}>
          כתובת זו תוגדר כיעד עבור התראות מסוג זה שנשלחות בערוץ אימייל.
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
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>כתובת אימייל</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            dir="ltr"
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              textAlign: "right",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
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
