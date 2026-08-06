import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { PageHeader, ErrorBanner } from "../components/ui.jsx";
import ReportModal from "../components/ReportModal.jsx";
import ReportPreviewModal from "../components/ReportPreviewModal.jsx";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function buildPrintHtml(report, preview) {
  let contentHtml;
  if (preview.type === "table") {
    contentHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead><tr>${preview.columns
          .map((c) => `<th style="background:#1a2542;color:#fff;">${escapeHtml(c.label)}</th>`)
          .join("")}</tr></thead>
        <tbody>${preview.rows
          .map(
            (row) =>
              `<tr>${preview.columns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join("")}</tr>`
          )
          .join("")}</tbody>
      </table>`;
  } else if (preview.type === "distribution") {
    const section = (title, counts) => `
      <h3>${escapeHtml(title)}</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tbody>${Object.entries(counts)
          .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`)
          .join("")}</tbody>
      </table>`;
    contentHtml = section("לפי דירוג", preview.by_rating) + section("לפי מודל", preview.by_model);
  } else {
    contentHtml = `
      <p><strong>מטרה:</strong> ${escapeHtml(preview.purpose)}</p>
      <p><strong>תוכן:</strong> ${escapeHtml(preview.content)}</p>`;
  }
  return `<!doctype html>
    <html dir="rtl" lang="he">
      <head><meta charset="utf-8"><title>${escapeHtml(report.id)} - ${escapeHtml(report.title)}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>${escapeHtml(report.id)}: ${escapeHtml(report.title)}</h2>
        ${contentHtml}
      </body>
    </html>`;
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [exportingId, setExportingId] = useState(null);

  const loadReports = useCallback(() => {
    setLoading(true);
    return api
      .getReports()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const rows = data?.rows ?? [];

  function handleExportExcel(report) {
    const link = document.createElement("a");
    link.href = `/api/reports/${encodeURIComponent(report.id)}/export.csv`;
    link.download = `${report.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleExportPdf(report) {
    // Must open the window synchronously, inside the click handler and
    // before any await — otherwise the browser no longer sees it as tied
    // to the user gesture and blocks it as a popup.
    const win = window.open("", "_blank");
    if (!win) {
      setError("החלון החדש נחסם על ידי הדפדפן — יש לאפשר חלונות קופצים");
      return;
    }
    win.document.write("<p style=\"font-family:Arial,sans-serif;padding:24px;\">טוען…</p>");
    setExportingId(report.id);
    try {
      const preview = await api.previewReport(report.id);
      win.document.open();
      win.document.write(buildPrintHtml(report, preview));
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    } catch (err) {
      win.close();
      setError(err.message);
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול דוחות" />
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + צור דוח
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading && <div style={{ padding: 16, color: "var(--text-light)", fontSize: 13 }}>טוען נתונים…</div>}
      {!loading && rows.length === 0 && !error && (
        <div style={{ padding: 16, color: "var(--text-light)", fontSize: 13 }}>אין דוחות להצגה.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 18, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    background: "var(--navy)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    padding: "2px 8px",
                    marginBottom: 6,
                  }}
                >
                  {r.id}
                </span>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-dark)" }}>{r.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setModal({ mode: "edit", report: r })}
                aria-label="עריכה"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)", flexShrink: 0 }}
              >
                ✎
              </button>
            </div>

            {r.purpose && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, color: "var(--text-light)", fontWeight: 600, marginBottom: 2 }}>מטרה</div>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)" }}>{r.purpose}</div>
              </div>
            )}
            {r.content && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, color: "var(--text-light)", fontWeight: 600, marginBottom: 2 }}>תוכן</div>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.5 }}>{r.content}</div>
              </div>
            )}

            <div style={{ marginTop: "auto" }}>
              {r.export_formats.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {r.export_formats.map((fmt) => (
                    <span
                      key={fmt}
                      style={{
                        fontSize: 11,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "1px 8px",
                        color: "var(--text-mid)",
                      }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setPreviewTarget(r)}
                  style={{
                    background: "#fff",
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  👁 תצוגה מקדימה
                </button>
                {r.export_formats.includes("Excel") && (
                  <button
                    type="button"
                    onClick={() => handleExportExcel(r)}
                    style={{
                      background: "#fff",
                      color: "var(--text-mid)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⇩ Excel
                  </button>
                )}
                {r.export_formats.includes("PDF") && (
                  <button
                    type="button"
                    onClick={() => handleExportPdf(r)}
                    disabled={exportingId === r.id}
                    style={{
                      background: "#fff",
                      color: "var(--text-mid)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: exportingId === r.id ? "default" : "pointer",
                      opacity: exportingId === r.id ? 0.6 : 1,
                    }}
                  >
                    🖨 PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ReportModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.report : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadReports();
          }}
        />
      )}

      {previewTarget && <ReportPreviewModal report={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </div>
  );
}
