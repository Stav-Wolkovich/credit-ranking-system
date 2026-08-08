import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import AssetModal from "../components/AssetModal.jsx";
import { FilterableTableHead } from "../components/FilterableTh.jsx";
import { useColumnFilters } from "../hooks/useColumnFilters.js";

const COLUMNS = [
  { key: "id", label: "קוד נכס", accessor: (r) => r.id },
  { key: "name", label: "שם נכס", accessor: (r) => r.name },
  { key: "type", label: "סוג", accessor: (r) => r.type },
  { key: "issuer_name", label: "מנפיק", accessor: (r) => r.issuer_name },
  { key: "cycle_stage", label: "שלב מחזור", accessor: (r) => r.cycle_stage },
  { key: "active", label: "פעיל", accessor: (r) => (r.active ? "פעיל" : "לא פעיל") },
  { key: "actions", label: "פעולות", accessor: () => null, filterable: false },
];

export default function AssetsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadAssets = useCallback(() => {
    setLoading(true);
    return api
      .getAssets()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const rows = data?.rows ?? [];
  const filterState = useColumnFilters(rows, COLUMNS);
  const { search, setSearch, filteredRows } = filterState;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <PageHeader
          crumbs={["בית", "דירוג פנימי", "נכסים"]}
          title="ניהול נכסים"
          meta={`נכסים ${data ? `${filteredRows.length}/${data.total}` : "–"} · עודכן ${
            data?.last_updated ?? "–"
          }`}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            placeholder="חיפוש שם / קוד"
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
            + צור נכס
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
                  אין נכסים להצגה.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.name}</td>
                <td style={{ padding: "12px 16px" }}>{r.type ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.issuer_name ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.cycle_stage ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.active ? "פעיל" : "לא פעיל"} tone={r.active ? "green" : "gray"} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", asset: r })}
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

      {modal && (
        <AssetModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.asset : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadAssets();
          }}
        />
      )}
    </div>
  );
}
