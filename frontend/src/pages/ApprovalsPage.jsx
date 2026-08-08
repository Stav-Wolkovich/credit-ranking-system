import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import ApprovalReviewModal from "../components/ApprovalReviewModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "status", label: "סטטוס", accessor: (r) => r.status },
  { key: "model", label: "מודל", accessor: (r) => r.model },
  { key: "team", label: "צוות", accessor: (r) => r.team },
  { key: "computed_score", label: "ציון מחושב", accessor: (r) => r.computed_score ?? null },
  { key: "computed_rating", label: "דירוג מחושב", accessor: (r) => r.computed_rating },
  { key: "framework", label: "מסגרת", accessor: (r) => r.framework },
  { key: "code", label: "קוד", accessor: (r) => r.code },
  { key: "subject", label: "נושא הדירוג", accessor: (r) => r.subject },
  { key: "id", label: "מס' תהליך", accessor: (r) => r.id },
  { key: "actions", label: "פעולות", accessor: () => null, filterable: false },
];

const TABS = [
  { id: "manager", label: "אישור מנהל" },
  { id: "committee", label: "אישור ועדה" },
];

export default function ApprovalsPage() {
  const [tab, setTab] = useState("manager");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  const loadTab = useCallback((tabId) => {
    setLoading(true);
    setError(null);
    const fetcher = tabId === "manager" ? api.getManagerApprovals : api.getCommitteeApprovals;
    return fetcher()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setData(null);
    loadTab(tab);
  }, [tab, loadTab]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="תור אישורים" />
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

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? "var(--accent)" : "transparent"}`,
              color: tab === t.id ? "var(--accent)" : "var(--text-mid)",
              fontWeight: tab === t.id ? 700 : 600,
              fontSize: 14,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

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
                  {tab === "manager" ? "אין תהליכים הממתינים לאישור מנהל." : "אין תהליכים הממתינים לאישור ועדה."}
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.model ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.team ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.framework ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.code}</td>
                <td style={{ padding: "12px 16px" }}>{r.subject ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setReviewTarget(r)}
                    style={{
                      background: "#fff",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🔍 בדיקה ואישור
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewTarget && (
        <ApprovalReviewModal
          process={reviewTarget}
          stage={tab}
          onCancel={() => setReviewTarget(null)}
          onApproved={() => {
            setReviewTarget(null);
            loadTab(tab);
          }}
        />
      )}
    </div>
  );
}
