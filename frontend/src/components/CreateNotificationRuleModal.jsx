import React, { useState } from "react";
import { api } from "../api.js";

export default function CreateNotificationRuleModal({ notificationTypes, onCancel, onSaved }) {
  const [typeIds, setTypeIds] = useState(new Set());
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function toggleType(id) {
    setTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validate() {
    const missing = new Set();
    if (typeIds.size === 0) missing.add("types");
    if (!title.trim()) missing.add("title");
    if (!message.trim()) missing.add("message");
    if (!recipientEmail.trim()) missing.add("email");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.createNotificationRule({
        title: title.trim(),
        message: message.trim(),
        recipient_email: recipientEmail.trim(),
        type_ids: [...typeIds],
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
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "88vh",
          padding: 22,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            יצירת התראה חדשה <span>✉</span>
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

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>סוג/י אירוע *</div>
            {fieldErrors.has("types") && (
              <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ יש לבחור לפחות סוג אירוע אחד</div>
            )}
            <div
              style={{
                border: `1px solid ${fieldErrors.has("types") ? "#e0a0a0" : "var(--border)"}`,
                borderRadius: 6,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {notificationTypes.map((t, i) => (
                <label
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <input type="checkbox" checked={typeIds.has(t.id)} onChange={() => toggleType(t.id)} />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>כותרת המייל *</div>
            {fieldErrors.has("title") && (
              <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                border: `1px solid ${fieldErrors.has("title") ? "#e0a0a0" : "var(--border)"}`,
                borderRadius: 6,
                padding: "9px 12px",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תוכן ההודעה *</div>
            {fieldErrors.has("message") && (
              <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                border: `1px solid ${fieldErrors.has("message") ? "#e0a0a0" : "var(--border)"}`,
                borderRadius: 6,
                padding: "9px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>כתובת אימייל לשליחה *</div>
            {fieldErrors.has("email") && (
              <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
            )}
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="name@company.com"
              dir="ltr"
              style={{
                width: "100%",
                border: `1px solid ${fieldErrors.has("email") ? "#e0a0a0" : "var(--border)"}`,
                borderRadius: 6,
                padding: "9px 12px",
                fontSize: 13,
                textAlign: "right",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
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
