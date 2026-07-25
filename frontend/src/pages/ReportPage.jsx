import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, StatCard, PageHeader, ErrorBanner } from "../components/ui.jsx";

const COLUMNS = [
  "סטטוס",
  "מודל",
  "צוות",
  "ציון מחושב",
  "דירוג מחושב",
  "ציון סופי",
  "דירוג סופי",
  "השלמה",
  "תוקף מ-",
  "תוקף עד",
  "תאריך נתונים",
  "מסגרת",
  "סוג",
  "קוד",
  "נושא הדירוג",
  "מס' תהליך",
];

export default function ReportPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expiringWithinDays, setExpiringWithinDays] = useState(60);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .getReport(expiringWithinDays)
        .then((res) => {
          if (!cancelled) setData(res);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expiringWithinDays]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <div>
      <PageHeader
        crumbs={["בית", "דירוג פנימי", "דוח דירוג פנימי"]}
        title="דוח דירוג פנימי"
        meta={summary ? `${summary.total_processes} תהליכים · עודכן ${summary.last_updated}` : "טוען…"}
      />

      {error && <ErrorBanner message={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              יפוגו תוך
              <input
                type="number"
                min={0}
                value={expiringWithinDays}
                onChange={(e) => setExpiringWithinDays(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: 46,
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "2px 4px",
                  fontSize: 12.5,
                  textAlign: "center",
                }}
              />
              יום
            </span>
          }
          value={summary?.expiring_soon}
          warn
          loading={loading}
        />
        <StatCard label="ממתינים לאישור" value={summary?.awaiting_approval} loading={loading} />
        <StatCard label="בתהליך" value={summary?.in_progress} loading={loading} />
        <StatCard label="תהליכים בתוקף" value={summary?.in_force} loading={loading} />
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px" }}>
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
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.model}</td>
                <td style={{ padding: "12px 16px" }}>{r.team}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.final_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.final_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.completion}%</td>
                <td style={{ padding: "12px 16px" }}>{r.valid_from ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.valid_until ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.data_date ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.framework}</td>
                <td style={{ padding: "12px 16px" }}>{r.kind}</td>
                <td style={{ padding: "12px 16px" }}>{r.code}</td>
                <td style={{ padding: "12px 16px" }}>{r.subject}</td>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
