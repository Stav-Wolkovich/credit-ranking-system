import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const CYCLE_STAGE_OPTIONS = ["בסיס / היתכנות", "הקמה", "הפעלה"];

function Field({ label, required, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
        {label}
        {required && " *"}
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
        }}
      />
    </div>
  );
}

export default function AssetModal({ mode, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    type: initial?.type ?? "",
    issuer_id: initial?.issuer_id ?? "",
    cycle_stage: initial?.cycle_stage ?? "",
  });
  const [issuers, setIssuers] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getIssuers()
      .then((res) => setIssuers(res.rows))
      .catch((err) => setError(err.message));
  }, []);

  const title = mode === "create" ? "צור נכס" : "עריכה";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSave() {
    if (!form.id.trim() || !form.name.trim()) {
      setError("קוד נכס ושם נכס הם שדות חובה");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      type: form.type.trim() || null,
      issuer_id: form.issuer_id || null,
      cycle_stage: form.cycle_stage || null,
    };
    try {
      const saved = mode === "create" ? await api.createAsset(payload) : await api.updateAsset(initial.id, payload);
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

        <Field label="קוד נכס" required value={form.id} onChange={set("id")} />
        <Field label="שם נכס" required value={form.name} onChange={set("name")} />
        <Field label="סוג" value={form.type} onChange={set("type")} />

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>מנפיק</div>
          <select
            value={form.issuer_id}
            onChange={set("issuer_id")}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">–</option>
            {issuers.map((iss) => (
              <option key={iss.id} value={iss.id}>
                ({iss.id}) {iss.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>שלב מחזור</div>
          <select
            value={form.cycle_stage}
            onChange={set("cycle_stage")}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">–</option>
            {CYCLE_STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
