import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { buildReportPrintHtml, rankingChangeDirection } from "../reportExport.js";

const ENTITY_SELECT_REPORT_TYPES = ["rating_detail", "rating_comparison"];

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

function EntityHeader({ entity, kind }) {
  return (
    <div style={{ marginBottom: 14, padding: "10px 12px", background: "#f7f8fa", borderRadius: 6 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-light)" }}>{kind}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>{entity.name}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-light)" }}>{entity.id}</div>
    </div>
  );
}

function EntityDetailView({ preview }) {
  return (
    <div>
      <EntityHeader entity={preview.entity} kind={preview.entity_kind} />
      {preview.rankings.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-light)" }}>לא נמצאו תהליכי דירוג עבור ישות זו.</div>
      ) : (
        preview.rankings.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {r.code} — {r.model ?? "-"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
              סטטוס: {r.status} · צוות: {r.team ?? "-"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 4 }}>
              ציון מחושב: {r.computed_score ?? "-"} ({r.computed_rating ?? "-"}) · ציון סופי: {r.final_score ?? "-"} (
              {r.final_rating ?? "-"})
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 8 }}>
              תוקף: {r.valid_from ?? "-"} עד {r.valid_until ?? "-"}
            </div>
            {r.questionnaire_groups.length > 0 && (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--text-light)", fontWeight: 600 }}>
                      קבוצת שאלון
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--text-light)", fontWeight: 600 }}>
                      משקל
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.questionnaire_groups.map((g) => (
                    <tr key={g.name} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "4px 6px" }}>{g.name}</td>
                      <td style={{ padding: "4px 6px" }}>{g.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8 }}>
        פירוט תשובות, היסטוריית אישורים ומסלול אודיט אינם זמינים במערכת עבור ישות זו.
      </div>
    </div>
  );
}

const COMPARISON_FIELD_ROWS = [
  ["מודל", "model"],
  ["צוות", "team"],
  ["סטטוס", "status"],
  ["ציון מחושב", "computed_score"],
  ["דירוג מחושב", "computed_rating"],
  ["ציון סופי", "final_score"],
  ["דירוג סופי", "final_rating"],
  ["תוקף מ-", "valid_from"],
  ["תוקף עד", "valid_until"],
];

function comparisonCellColor(cols, i, key) {
  if (i === 0) return null;
  const scoreKey = key.startsWith("computed") ? "computed_score" : key.startsWith("final") ? "final_score" : null;
  if (!scoreKey) return null;
  const dir = rankingChangeDirection(cols[i][scoreKey], cols[i - 1][scoreKey]);
  if (dir === "up") return "#1e7e3c";
  if (dir === "down") return "#b52d2d";
  return null;
}

function EntityComparisonView({ preview }) {
  const cols = preview.rankings;
  return (
    <div>
      <EntityHeader entity={preview.entity} kind={preview.entity_kind} />
      {cols.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-light)" }}>לא נמצאו תהליכי דירוג עבור ישות זו.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "var(--navy)" }}>
                <th style={{ padding: "8px 12px" }} />
                {cols.map((c) => (
                  <th key={c.id} style={{ color: "#fff", fontWeight: 600, fontSize: 12, padding: "8px 12px", whiteSpace: "nowrap" }}>
                    {c.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FIELD_ROWS.map(([label, key]) => (
                <tr key={key} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-mid)", whiteSpace: "nowrap" }}>
                    {label}
                  </td>
                  {cols.map((c, i) => {
                    const color = comparisonCellColor(cols, i, key);
                    return (
                      <td
                        key={c.id}
                        style={{ padding: "8px 12px", fontSize: 12.5, whiteSpace: "nowrap", color: color ?? undefined, fontWeight: color ? 700 : 400 }}
                      >
                        {c[key] ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8 }}>
        ירוק = שיפור מהתהליך הקודם, אדום = הרעה (לפי ציון מחושב/סופי).
      </div>
    </div>
  );
}

function EntityPicker({ kind, onKindChange, entityId, onEntityChange, issuers, assets, onSubmit, canSubmit, loading }) {
  const options = kind === "מנפיק" ? issuers : assets;
  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginBottom: 8 }}>
        יש לבחור מנפיק או נכס כדי להציג את הדוח:
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["מנפיק", "נכס"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindChange(k)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: `1px solid ${kind === k ? "var(--accent)" : "var(--border)"}`,
              background: kind === k ? "var(--accent)" : "#fff",
              color: kind === k ? "#fff" : "var(--text-mid)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <select
        value={entityId}
        onChange={(e) => onEntityChange(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
          background: "#fff",
          marginBottom: 12,
        }}
      >
        <option value="">בחר {kind}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "9px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: !canSubmit || loading ? "default" : "pointer",
          opacity: !canSubmit || loading ? 0.6 : 1,
        }}
      >
        {loading ? "טוען…" : "הצג נתונים"}
      </button>
    </div>
  );
}

export default function ReportPreviewModal({ report, onClose }) {
  const isEntityReport = ENTITY_SELECT_REPORT_TYPES.includes(report.report_type);

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!isEntityReport);

  const [kind, setKind] = useState("מנפיק");
  const [entityId, setEntityId] = useState("");
  const [issuers, setIssuers] = useState([]);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (!isEntityReport) {
      api
        .previewReport(report.id)
        .then(setPreview)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([api.getIssuers(), api.getAssets()])
      .then(([issuersRes, assetsRes]) => {
        setIssuers(issuersRes.rows);
        setAssets(assetsRes.rows);
      })
      .catch((err) => setError(err.message));
  }, [report.id, isEntityReport]);

  function handleSubmitEntity() {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    api
      .previewReport(report.id, { kind, entity_id: entityId })
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleExportExcel() {
    const link = document.createElement("a");
    const qs = new URLSearchParams({ kind, entity_id: entityId }).toString();
    link.href = `/api/reports/${encodeURIComponent(report.id)}/export.csv?${qs}`;
    link.download = `${report.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleExportPdf() {
    // Synchronous, direct click handler — the preview data is already
    // loaded in state, so there's no async gap that would get the popup
    // blocked.
    const win = window.open("", "_blank");
    if (!win) {
      setError("החלון החדש נחסם על ידי הדפדפן — יש לאפשר חלונות קופצים");
      return;
    }
    win.document.write(buildReportPrintHtml(report, preview));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
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
          {error && (
            <div
              style={{
                background: "#fbe9e9",
                color: "#b52d2d",
                border: "1px solid #f3c9c9",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12.5,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {isEntityReport && !preview && (
            <EntityPicker
              kind={kind}
              onKindChange={(k) => {
                setKind(k);
                setEntityId("");
              }}
              entityId={entityId}
              onEntityChange={setEntityId}
              issuers={issuers}
              assets={assets}
              onSubmit={handleSubmitEntity}
              canSubmit={Boolean(entityId)}
              loading={loading}
            />
          )}

          {!isEntityReport && loading && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>טוען…</div>
          )}

          {!error && preview?.type === "table" && <DataTable columns={preview.columns} rows={preview.rows} />}
          {!error && preview?.type === "distribution" && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <DistributionTable title="לפי דירוג" counts={preview.by_rating} />
              <DistributionTable title="לפי מודל" counts={preview.by_model} />
            </div>
          )}
          {!error && preview?.type === "entity_detail" && <EntityDetailView preview={preview} />}
          {!error && preview?.type === "entity_comparison" && <EntityComparisonView preview={preview} />}
          {!error && preview?.type === "spec" && (
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
          {isEntityReport && preview && (
            <>
              {report.export_formats.includes("Excel") && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    background: "#fff",
                    color: "var(--text-mid)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ⇩ Excel
                </button>
              )}
              {report.export_formats.includes("PDF") && (
                <button
                  type="button"
                  onClick={handleExportPdf}
                  style={{
                    background: "#fff",
                    color: "var(--text-mid)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🖨 PDF
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                }}
                style={{
                  background: "#fff",
                  color: "var(--text-mid)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                בחירה אחרת
              </button>
            </>
          )}
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
