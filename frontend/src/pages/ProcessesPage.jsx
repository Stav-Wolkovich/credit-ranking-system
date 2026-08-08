import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import ProcessModal from "../components/ProcessModal.jsx";
import ProcessScoringModal from "../components/ProcessScoringModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "id", label: "מס' תהליך", accessor: (r) => r.id },
  { key: "subject", label: "נושא הדירוג", accessor: (r) => r.subject },
  { key: "code", label: "קוד", accessor: (r) => r.code },
  { key: "framework", label: "מסגרת", accessor: (r) => r.framework },
  { key: "status", label: "סטטוס", accessor: (r) => r.status },
  { key: "owner_name", label: "אחראי תהליך", accessor: (r) => r.owner_name },
  { key: "owner_team_name", label: "צוות", accessor: (r) => r.owner_team_name },
  { key: "computed_score", label: "ציון מחושב", accessor: (r) => r.computed_score ?? null },
  { key: "computed_rating", label: "דירוג מחושב", accessor: (r) => r.computed_rating },
  { key: "final_score", label: "ציון סופי", accessor: (r) => r.final_score ?? null },
  { key: "final_rating", label: "דירוג סופי", accessor: (r) => r.final_rating },
  { key: "completion", label: "השלמה", accessor: (r) => `${r.completion}%` },
  { key: "actions", label: "", accessor: () => null, filterable: false },
];

export default function ProcessesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [scoringTarget, setScoringTarget] = useState(null);

  const loadProcesses = useCallback(() => {
    setLoading(true);
    return api
      .getProcesses()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="תהליכי דירוג" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <button
            type="button"
            onClick={() => setModalOpen(true)}
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
                  אין תהליכים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.subject}</td>
                <td style={{ padding: "12px 16px" }}>{r.code}</td>
                <td style={{ padding: "12px 16px" }}>{r.framework}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.status} tone={r.tone} />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.owner_name ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.owner_team_name ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.computed_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.final_score ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.final_rating ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.completion}%</td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setScoringTarget(r)}
                    aria-label="מילוי שאלונים ודירוג"
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

      {modalOpen && (
        <ProcessModal
          onCancel={() => setModalOpen(false)}
          onSaved={(saved) => {
            setModalOpen(false);
            loadProcesses();
            setScoringTarget(saved);
          }}
        />
      )}

      {scoringTarget && (
        <ProcessScoringModal
          process={scoringTarget}
          onCancel={() => {
            setScoringTarget(null);
            loadProcesses();
          }}
        />
      )}
    </div>
  );
}
