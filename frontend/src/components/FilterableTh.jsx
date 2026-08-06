import React, { useEffect, useRef, useState } from "react";

/**
 * Renders a full <thead> row from a column list, using FilterableTh for
 * every filterable column and a plain <th> for the rest (e.g. action
 * columns). Pass the object returned by useColumnFilters as `filterState`.
 */
export function FilterableTableHead({ columns, filterState }) {
  const { getOptionsFor, filters, setColumnFilter } = filterState;
  return (
    <thead>
      <tr style={{ background: "var(--navy)" }}>
        {columns.map((col) =>
          col.filterable === false ? (
            <th key={col.key} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px" }}>
              {col.label}
            </th>
          ) : (
            <FilterableTh
              key={col.key}
              label={col.label}
              options={getOptionsFor(col.key)}
              selected={filters[col.key] ?? new Set()}
              onChange={(next) => setColumnFilter(col.key, next)}
            />
          )
        )}
      </tr>
    </thead>
  );
}

/**
 * A <th> with a filter funnel button that opens a checkbox popover listing
 * every distinct value present in that column (given the other active
 * filters), so the user can narrow the table to just those values.
 */
export default function FilterableTh({ label, options, selected, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const active = selected && selected.size > 0;

  function toggleOpen(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const width = 220;
      const left = Math.min(Math.max(8, rect.left - width + rect.width), window.innerWidth - width - 8);
      const top = Math.min(rect.bottom + 4, window.innerHeight - 60);
      setPos({ top, left });
    }
    setOpen((o) => !o);
  }

  function toggleValue(v) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(options));
  }

  function clear() {
    onChange(new Set());
  }

  return (
    <th
      style={{
        color: "#fff",
        fontWeight: 600,
        fontSize: 12.5,
        padding: "12px 16px",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span>{label}</span>
        <button
          type="button"
          ref={btnRef}
          onClick={toggleOpen}
          aria-label={`סינון לפי ${label}`}
          title={`סינון לפי ${label}`}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: active ? "#6fc7ff" : "rgba(255,255,255,0.65)",
            fontSize: 12,
            padding: 2,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ▾
        </button>
      </div>

      {open && (
        <div
          ref={popRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 220,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 14px rgba(20,26,38,0.18)",
            zIndex: 200,
            fontWeight: 400,
            color: "var(--text-dark)",
            textAlign: "right",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <button
              type="button"
              onClick={selectAll}
              style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              בחר הכל
            </button>
            <button
              type="button"
              onClick={clear}
              style={{ background: "transparent", border: "none", color: "#b52d2d", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              נקה
            </button>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {options.length === 0 && (
              <div style={{ padding: 10, fontSize: 12.5, color: "var(--text-light)" }}>אין ערכים</div>
            )}
            {options.map((opt) => (
              <label
                key={opt}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12.5, cursor: "pointer" }}
              >
                <input type="checkbox" checked={selected?.has(opt) ?? false} onChange={() => toggleValue(opt)} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </th>
  );
}
