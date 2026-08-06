import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function DataTable({ columns, rows }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--text-light)", padding: "16px 0" }}>אין נתונים להצגה.</div>;
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "var(--navy)" }}>
            {columns.map((c) => (
              <th key={c.key} style={{ color: "#fff", fontWeight: 600, fontSize: 12, padding: "8px 12px", whiteSpace: "nowrap" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "8px 12px", fontSize: 12.5, whiteSpace: "nowrap" }}>
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionTable({ title, counts }) {
  const entries = Object.entries(counts);
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 6, fontWeight: 600 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-light)" }}>אין נתונים.</div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          {entries.map(([label, count], i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 12px",
                fontSize: 12.5,
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span>{label}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportPreviewModal({ report, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .previewReport(report.id)
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [report.id]);

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
      <div style={{ background: "#fff", borderRadius: 10, width: 640, maxWidth: "94vw", maxHeight: "88vh", padding: 22, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dark)", display: "flex", gap: 8, alignItems: "center" }}>
            תצוגה מקדימה <span>👁</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-mid)" }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 16 }}>
          {report.id} · {report.title}
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>}
          {error && (
            <div
              style={{
                background: "#fbe9e9",
                color: "#b52d2d",
                border: "1px solid #f3c9c9",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
          {!loading && !error && preview?.type === "table" && (
            <DataTable columns={preview.columns} rows={preview.rows} />
          )}
          {!loading && !error && preview?.type === "distribution" && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <DistributionTable title="לפי דירוג" counts={preview.by_rating} />
              <DistributionTable title="לפי מודל" counts={preview.by_model} />
            </div>
          )}
          {!loading && !error && preview?.type === "spec" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4, fontWeight: 600 }}>מטרה</div>
                <div style={{ fontSize: 13.5, color: "var(--text-dark)" }}>{preview.purpose ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4, fontWeight: 600 }}>תוכן</div>
                <div style={{ fontSize: 13.5, color: "var(--text-dark)", lineHeight: 1.6 }}>{preview.content ?? "-"}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 16 }}>
                דוח זה מוצג כאן לפי הגדרתו — אין עדיין מקור נתונים חי מחובר אליו.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
