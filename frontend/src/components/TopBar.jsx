import React from "react";

export default function TopBar({ onToggleSidebar }) {
  return (
    <div
      style={{
        height: 52,
        background: "var(--navy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          aria-label="תפריט"
          style={{
            background: "transparent",
            border: "none",
            color: "#dbe3ef",
            fontSize: 18,
            cursor: "pointer",
            width: 30,
            height: 30,
          }}
        >
          ☰
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#3a5a9a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            ח.ש
          </div>
          <span>חטיבת השקעות · Back Office</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#3a5a9a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          HR
        </div>
      </div>
    </div>
  );
}
