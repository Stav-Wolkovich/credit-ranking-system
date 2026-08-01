import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const TYPE_OPTIONS = ["רשת 2D", "רשת תלת-ממדית"];

function Field({ label, required, invalid, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      {invalid && <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          border: `1px solid ${invalid ? "#e0a0a0" : "var(--border)"}`,
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
        }}
      />
    </div>
  );
}

function AxisValueList({ label, values, onUpdate, onRemove, onAdd }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>{label}</div>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="הסר ערך"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
          >
            ✕
          </button>
          <input
            type="text"
            dir="ltr"
            value={v}
            onChange={(e) => onUpdate(i, e.target.value)}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "7px 10px",
              fontSize: 13,
              textAlign: "right",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-light)", minWidth: 16, textAlign: "center" }}>
            {i + 1}
          </span>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--accent)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        + הוסף ערך
      </button>
    </div>
  );
}

function cellTint(value) {
  if (!value) return "#f2f3f5";
  return value > 0 ? "#e5f5ea" : "#fbe9e9";
}

function MatrixGrid({ xValues, yValues, xAxisLabel, yAxisLabel, grid, onCellChange }) {
  if (xValues.length === 0 || yValues.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--text-light)", padding: "10px 0" }}>
        הוסף ערכים לשני הצירים כדי לבנות את הרשת.
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
      <table dir="ltr" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {xValues.map((x, c) => (
              <th
                key={c}
                style={{
                  background: "var(--navy)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 12,
                  padding: "8px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {x}
              </th>
            ))}
            <th
              style={{
                background: "var(--navy)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 10.5,
                padding: "8px 10px",
                whiteSpace: "nowrap",
              }}
            >
              {xAxisLabel || "ציר אופקי"} ←<br />
              {yAxisLabel || "ציר אנכי"} ↓
            </th>
          </tr>
        </thead>
        <tbody>
          {yValues.map((y, r) => (
            <tr key={r}>
              {xValues.map((_, c) => (
                <td key={c} style={{ padding: 3, borderTop: "1px solid var(--border)" }}>
                  <input
                    type="number"
                    step="0.01"
                    value={grid[r]?.[c] ?? 0}
                    onChange={(e) => onCellChange(r, c, Number(e.target.value))}
                    style={{
                      width: 60,
                      textAlign: "center",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "6px 4px",
                      fontSize: 12.5,
                      background: cellTint(grid[r]?.[c]),
                    }}
                  />
                </td>
              ))}
              <td
                style={{
                  padding: "8px 10px",
                  borderTop: "1px solid var(--border)",
                  fontSize: 12.5,
                  color: "var(--text-mid)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {y}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

export default function MatrixModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    type: initial?.type ?? TYPE_OPTIONS[0],
    model_id: initial?.model_id ?? "",
    axes: initial?.axes ?? 2,
    cells: initial?.cells ?? 0,
    description: initial?.description ?? "",
    x_axis_label: initial?.x_axis_label ?? "",
    y_axis_label: initial?.y_axis_label ?? "",
  });
  const [xValues, setXValues] = useState([]);
  const [yValues, setYValues] = useState([]);
  const [grid, setGrid] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getModels()
      .then((res) => setModels(res.rows))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (mode === "edit" && initial?.id) {
      api
        .getMatrix(initial.id)
        .then((full) => {
          setForm({
            id: full.id,
            name: full.name,
            type: full.type,
            model_id: full.model_id,
            axes: full.axes,
            cells: full.cells,
            description: full.description ?? "",
            x_axis_label: full.x_axis_label ?? "",
            y_axis_label: full.y_axis_label ?? "",
          });
          setXValues(full.x_values ?? []);
          setYValues(full.y_values ?? []);
          setGrid(full.cell_values ?? []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [mode, initial]);

  const title = mode === "create" ? "צור מטריצה" : "עריכה";
  const isGrid = form.type === TYPE_OPTIONS[0];

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function addXValue() {
    setXValues((v) => [...v, ""]);
    setGrid((g) => (g.length ? g.map((row) => [...row, 0]) : g));
  }
  function removeXValue(i) {
    setXValues((v) => v.filter((_, idx) => idx !== i));
    setGrid((g) => g.map((row) => row.filter((_, idx) => idx !== i)));
  }
  function updateXValue(i, text) {
    setXValues((v) => v.map((val, idx) => (idx === i ? text : val)));
  }

  function addYValue() {
    setYValues((v) => [...v, ""]);
    setGrid((g) => [...g, Array.from({ length: xValues.length }, () => 0)]);
  }
  function removeYValue(i) {
    setYValues((v) => v.filter((_, idx) => idx !== i));
    setGrid((g) => g.filter((_, idx) => idx !== i));
  }
  function updateYValue(i, text) {
    setYValues((v) => v.map((val, idx) => (idx === i ? text : val)));
  }

  function updateCell(r, c, value) {
    setGrid((g) => {
      const next = g.length ? g.map((row) => [...row]) : emptyGrid(yValues.length, xValues.length);
      next[r][c] = value;
      return next;
    });
  }

  function validate() {
    const missing = new Set();
    if (!form.id.trim()) missing.add("id");
    if (!form.name.trim()) missing.add("name");
    if (!form.model_id) missing.add("model_id");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const useGrid = isGrid && xValues.filter((v) => v.trim()).length > 0 && yValues.filter((v) => v.trim()).length > 0;
    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      type: form.type,
      model_id: form.model_id,
      axes: Number(form.axes) || 0,
      cells: Number(form.cells) || 0,
      description: form.description.trim() || null,
      x_axis_label: form.x_axis_label.trim() || null,
      y_axis_label: form.y_axis_label.trim() || null,
      x_values: useGrid ? xValues : [],
      y_values: useGrid ? yValues : [],
      cell_values: useGrid ? grid : [],
    };
    try {
      const saved =
        mode === "create" ? await api.createMatrix(payload) : await api.updateMatrix(initial.id, payload);
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
          width: 720,
          maxWidth: "94vw",
          maxHeight: "90vh",
          padding: 22,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            {title} <span>{mode === "create" ? "➕" : "✎"}</span>
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

        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>
        ) : (
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="קוד מטריצה" required invalid={fieldErrors.has("id")} value={form.id} onChange={set("id")} />
              <Field label="שם מטריצה" required invalid={fieldErrors.has("name")} value={form.name} onChange={set("name")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>סוג</div>
                <select
                  value={form.type}
                  onChange={set("type")}
                  style={{
                    width: "100%",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "9px 12px",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
                  מודל
                  {fieldErrors.has("model_id") && (
                    <span style={{ color: "#b52d2d", fontSize: 11.5 }}> ⚠ שדה חובה</span>
                  )}
                </div>
                <select
                  value={form.model_id}
                  onChange={set("model_id")}
                  style={{
                    width: "100%",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "9px 12px",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  <option value="">בחר מודל</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תיאור</div>
              <textarea
                value={form.description}
                onChange={set("description")}
                rows={2}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {isGrid ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="שם ציר אופקי" value={form.x_axis_label} onChange={set("x_axis_label")} />
                  <Field label="שם ציר אנכי" value={form.y_axis_label} onChange={set("y_axis_label")} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <AxisValueList
                    label="ערכי ציר אופקי"
                    values={xValues}
                    onUpdate={updateXValue}
                    onRemove={removeXValue}
                    onAdd={addXValue}
                  />
                  <AxisValueList
                    label="ערכי ציר אנכי"
                    values={yValues}
                    onUpdate={updateYValue}
                    onRemove={removeYValue}
                    onAdd={addYValue}
                  />
                </div>

                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 6 }}>תאי המטריצה</div>
                <MatrixGrid
                  xValues={xValues}
                  yValues={yValues}
                  xAxisLabel={form.x_axis_label}
                  yAxisLabel={form.y_axis_label}
                  grid={grid}
                  onCellChange={updateCell}
                />
              </>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="צירים" type="number" value={form.axes} onChange={set("axes")} />
                <Field label="תאים" type="number" value={form.cells} onChange={set("cells")} />
              </div>
            )}
          </div>
        )}

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
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
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
