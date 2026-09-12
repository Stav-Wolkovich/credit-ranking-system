import React from "react";

export default function Sidebar({ items, activePage, onSelect, open }) {
  return (
    <div
      style={{
        width: open ? 230 : 0,
        transition: "width .2s ease",
        overflow: "hidden",
        background: "#fff",
        borderLeft: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <div style={{ width: 230, padding: "14px 0" }}>
        {items.map((item) => {
          const active = item.id === activePage;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                fontSize: 13.5,
                color: active ? "#1a56c4" : "var(--text-mid)",
                fontWeight: active ? 600 : 400,
                background: active ? "#e8f0fe" : "transparent",
                borderRight: `3px solid ${active ? "var(--accent)" : "transparent"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
