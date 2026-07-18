import React from "react";

const TONE_STYLES = {
  blue: { bg: "#e8f0fe", text: "#1a56c4" },
  gray: { bg: "#eceef1", text: "#5a6472" },
  green: { bg: "#e5f5ea", text: "#1e7e3c" },
  red: { bg: "#fbe9e9", text: "#b52d2d" },
  amber: { bg: "#fdf1e0", text: "#a6650b" },
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
      <div style={{ fontSize: 12.5, color: "var(--text-light)", marginBottom: 6 }}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && " > "}
            <span style={{ color: i === crumbs.length - 1 ? "var(--text-mid)" : "var(--text-light)" }}>{c}</span>
          </span>
        ))}
      </div>
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
