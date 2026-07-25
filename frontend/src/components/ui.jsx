import React from "react";

const TONE_STYLES = {
  blue: { bg: "#e8f0fe", text: "#1a56c4" },
  gray: { bg: "#eceef1", text: "#5a6472" },
  green: { bg: "#e5f5ea", text: "#1e7e3c" },
  red: { bg: "#fbe9e9", text: "#b52d2d" },
  amber: { bg: "#fdf1e0", text: "#a6650b" },
  orange: { bg: "#ffe8d9", text: "#c2540a" },
};

export function Badge({ label, tone }) {
  const t = TONE_STYLES[tone] || TONE_STYLES.gray;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 14,
        fontSize: 12,
        fontWeight: 600,
        background: t.bg,
        color: t.text,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.text }} />
      {label}
    </span>
  );
}

export function StatCard({ label, value, warn, loading }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-mid)" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: warn ? "#b52d2d" : "var(--text-dark)" }}>
        {loading ? "…" : value}
      </span>
    </div>
  );
}

export function PageHeader({ crumbs, title, meta }) {
  return (
    <>
      {crumbs && crumbs.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--text-light)", marginBottom: 6 }}>
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && " > "}
              <span style={{ color: i === crumbs.length - 1 ? "var(--text-mid)" : "var(--text-light)" }}>{c}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-dark)", marginBottom: 2 }}>{title}</div>
      {meta && <div style={{ fontSize: 12.5, color: "var(--text-light)", marginBottom: 18 }}>{meta}</div>}
    </>
  );
}

export function PlaceholderPage({ label }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: "var(--text-light)",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-mid)" }}>{label}</div>
      <div style={{ fontSize: 13 }}>הדף בבנייה — נחבר אותו לנתונים בהמשך.</div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
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
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", marginBottom: 12 }}>
          {title ?? "מחיקה"}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text-mid)", marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
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
            onClick={onConfirm}
            style={{
              background: "#b52d2d",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmLabel ?? "מחיקה"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div
      style={{
        background: "#fbe9e9",
        color: "#b52d2d",
        border: "1px solid #f3c9c9",
        borderRadius: 8,
        padding: "12px 16px",
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      שגיאה בטעינת הנתונים: {message}
    </div>
  );
}
