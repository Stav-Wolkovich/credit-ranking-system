import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import ApprovalReviewModal from "../components/ApprovalReviewModal.jsx";

const COLUMNS = [
  "סטטוס",
  "מודל",
  "צוות",
  "ציון מחושב",
  "דירוג מחושב",
  "מסגרת",
  "קוד",
  "נושא הדירוג",
  "מס' תהליך",
  "פעולות",
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

  return (
    <div>
      <PageHeader title="תור אישורים" />

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
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px", whiteSpace: "nowrap" }}>
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
                  {tab === "manager" ? "אין תהליכים הממתינים לאישור מנהל." : "אין תהליכים הממתינים לאישור ועדה."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
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
