import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";

const COLUMNS = ["מס' תהליך", "נושא הדירוג", "קוד", "מסגרת", "סטטוס", "ציון סופי", "דירוג סופי", "השלמה", ""];

export default function ProcessesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getProcesses()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = data?.rows ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <PageHeader
          crumbs={["בית", "דירוג פנימי", "תהליכי דירוג"]}
          title="תהליכי דירוג"
          meta={
            data
              ? `${data.total} תהליכים · עודכן ${data.last_updated} · ניהול ומעקב אחר תהליכי דירוג פנימי. יצירת תהליך חדש, מעקב אחר סטטוס ומילוי.`
              : "טוען…"
          }
        />
        <button
          type="button"
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
          + תהליך חדש
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {COLUMNS.map((c, i) => (
                <th key={i} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין תהליכים להצגה.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.subject}</td>
                <td style={{ padding: "12px 16px" }}>{r.code}</td>
                <td style={{ padding: "12px 16px" }}>{r.framework}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.final_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.final_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.completion}%</td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
