import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, StatCard, PageHeader, ErrorBanner } from "../components/ui.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "status", label: "סטטוס", accessor: (r) => r.status },
  { key: "model", label: "מודל", accessor: (r) => r.model },
  { key: "team", label: "צוות", accessor: (r) => r.team },
  { key: "computed_score", label: "ציון מחושב", accessor: (r) => r.computed_score ?? null },
  { key: "computed_rating", label: "דירוג מחושב", accessor: (r) => r.computed_rating },
  { key: "final_score", label: "ציון סופי", accessor: (r) => r.final_score ?? null },
  { key: "final_rating", label: "דירוג סופי", accessor: (r) => r.final_rating },
  { key: "completion", label: "השלמה", accessor: (r) => `${r.completion}%` },
  { key: "valid_from", label: "תוקף מ-", accessor: (r) => r.valid_from },
  { key: "valid_until", label: "תוקף עד", accessor: (r) => r.valid_until },
  { key: "data_date", label: "תאריך נתונים", accessor: (r) => r.data_date },
  { key: "framework", label: "מסגרת", accessor: (r) => r.framework },
  { key: "kind", label: "סוג", accessor: (r) => r.kind },
  { key: "code", label: "קוד", accessor: (r) => r.code },
  { key: "subject", label: "נושא הדירוג", accessor: (r) => r.subject },
  { key: "id", label: "מס' תהליך", accessor: (r) => r.id },
];

export default function ReportPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expiringWithinDays, setExpiringWithinDays] = useState(60);
  const [expiringSoon, setExpiringSoon] = useState(null);
  const [expiringSoonLoading, setExpiringSoonLoading] = useState(true);

  // Main page data — fetched once. Does NOT depend on expiringWithinDays,
  // so changing that input never touches the table or the other stat boxes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getReport()
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

  // Isolated fetch for just the יפוגו תוך box (runs on mount too, and every
  // time the day count changes), so editing it only ever updates this one
  // number — never the table or the other stat boxes.
  useEffect(() => {
    let cancelled = false;
    setExpiringSoonLoading(true);
    const timer = setTimeout(() => {
      api
        .getExpiringSoon(expiringWithinDays)
        .then((res) => {
          if (!cancelled) setExpiringSoon(res.expiring_soon);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setExpiringSoonLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expiringWithinDays]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader
          crumbs={["בית", "דירוג פנימי", "דוח דירוג פנימי"]}
          title="דוח דירוג פנימי"
          meta={summary ? `${summary.total_processes} תהליכים · עודכן ${summary.last_updated}` : "טוען…"}
        />
        <input
          type="text"
          placeholder="חיפוש חופשי..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            width: 200,
          }}
        />
      </div>

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
          value={expiringSoon}
          warn
          loading={expiringSoonLoading}
        />
        <StatCard label="ממתינים לאישור" value={summary?.awaiting_approval} loading={loading} />
        <StatCard label="בתהליך" value={summary?.in_progress} loading={loading} />
        <StatCard label="תהליכים בתוקף" value={summary?.in_force} loading={loading} />
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <FilterableTableHead columns={COLUMNS} filterState={filterState} />
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && !error && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין תהליכים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
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
