import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const FRAMEWORK_KIND_OPTIONS = [
  { value: "מנפיק", label: "מנפיק" },
  { value: "נכס", label: "נכס" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProcessModal({ onCancel, onSaved }) {
  const [frameworkKind, setFrameworkKind] = useState("מנפיק");
  const [frameworkQuery, setFrameworkQuery] = useState("");
  const [frameworkSelected, setFrameworkSelected] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [issuers, setIssuers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState("");
  const [dataDate, setDataDate] = useState(todayIso());
  const [fieldErrors, setFieldErrors] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getIssuers().then((res) => setIssuers(res.rows)).catch((err) => setError(err.message));
    api.getAssets().then((res) => setAssets(res.rows)).catch((err) => setError(err.message));
    api
      .getModels()
      .then((res) => setModels(res.rows.filter((m) => m.status === "פעיל" && m.questionnaires_count > 0)))
      .catch((err) => setError(err.message));
    api.getUsers().then((res) => setUsers(res.rows)).catch((err) => setError(err.message));
  }, []);

  const frameworkOptions = frameworkKind === "מנפיק" ? issuers : assets;

  const filteredOptions = useMemo(() => {
    const q = frameworkQuery.trim().toLowerCase();
    if (!q) return frameworkOptions;
    return frameworkOptions.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    );
  }, [frameworkOptions, frameworkQuery]);

  function chooseFrameworkKind(kind) {
    setFrameworkKind(kind);
    setFrameworkSelected(null);
    setFrameworkQuery("");
    setDropdownOpen(true);
  }

  function selectFramework(option) {
    setFrameworkSelected(option);
    setDropdownOpen(false);
  }

  function clearFramework() {
    setFrameworkSelected(null);
    setFrameworkQuery("");
    setDropdownOpen(true);
  }

  function validate() {
    const missing = new Set();
    if (!frameworkSelected) missing.add("framework");
    if (!modelId) missing.add("model");
    if (!ownerId) missing.add("owner");
    setFieldErrors(missing);
    return missing.size === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const payload = {
      model_id: modelId,
      kind: frameworkKind,
      framework_issuer_id: frameworkKind === "מנפיק" ? frameworkSelected.id : null,
      framework_asset_id: frameworkKind === "נכס" ? frameworkSelected.id : null,
      data_date: dataDate || null,
      owner: ownerId,
    };
    try {
      const saved = await api.createProcess(payload);
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
      <div style={{ background: "#fff", borderRadius: 10, width: 460, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            יצירת תהליך דירוג חדש <span>➕</span>
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

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>מסגרת *</div>
          {fieldErrors.has("framework") && (
            <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {FRAMEWORK_KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => chooseFrameworkKind(opt.value)}
                style={{
                  flex: 1,
                  border: `1px solid ${frameworkKind === opt.value ? "var(--accent)" : "var(--border)"}`,
                  background: frameworkKind === opt.value ? "var(--accent)" : "#fff",
                  color: frameworkKind === opt.value ? "#fff" : "var(--text-mid)",
                  borderRadius: 6,
                  padding: "7px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {frameworkSelected ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: `1px solid ${fieldErrors.has("framework") ? "#e0a0a0" : "var(--border)"}`,
                borderRadius: 6,
                padding: "9px 12px",
                fontSize: 13,
              }}
            >
              <span>
                <strong>{frameworkSelected.name}</strong>{" "}
                <span style={{ color: "var(--text-light)" }}>({frameworkSelected.id})</span>
              </span>
              <button
                type="button"
                onClick={clearFramework}
                aria-label="נקה בחירה"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="בחר מסגרת..."
                value={frameworkQuery}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setFrameworkQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                style={{
                  width: "100%",
                  border: `1px solid ${fieldErrors.has("framework") ? "#e0a0a0" : "var(--border)"}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                }}
              />
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    maxHeight: 220,
                    overflowY: "auto",
                    background: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    boxShadow: "0 4px 14px rgba(20,26,38,0.12)",
                    zIndex: 10,
                  }}
                >
                  {filteredOptions.length === 0 && (
                    <div style={{ padding: 12, fontSize: 13, color: "var(--text-light)", textAlign: "center" }}>
                      אין תוצאות.
                    </div>
                  )}
                  {filteredOptions.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => selectFramework(o)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "9px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span>{o.name}</span>
                      <span style={{ color: "var(--text-light)" }}>{o.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>מודל דירוג *</div>
          {fieldErrors.has("model") && (
            <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
          )}
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{
              width: "100%",
              border: `1px solid ${fieldErrors.has("model") ? "#e0a0a0" : "var(--border)"}`,
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">בחר מודל</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id}) – {m.active_version}
              </option>
            ))}
          </select>
          {models.length === 0 && (
            <div style={{ fontSize: 11.5, color: "var(--text-light)", marginTop: 4 }}>
              אין מודלים זמינים ליצירת תהליך — נדרש מודל בסטטוס פעיל עם שאלון אחד לפחות מקושר.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>אחראי תהליך *</div>
          {fieldErrors.has("owner") && (
            <div style={{ fontSize: 11.5, color: "#b52d2d", marginBottom: 4 }}>⚠ שדה חובה</div>
          )}
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            style={{
              width: "100%",
              border: `1px solid ${fieldErrors.has("owner") ? "#e0a0a0" : "var(--border)"}`,
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="">בחר אחראי תהליך</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>תאריך נתונים</div>
          <input
            type="date"
            value={dataDate}
            onChange={(e) => setDataDate(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
            }}
          />
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
            onClick={handleCreate}
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
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving ? "יוצר…" : <>צור תהליך ➕</>}
          </button>
        </div>
      </div>
    </div>
  );
}
