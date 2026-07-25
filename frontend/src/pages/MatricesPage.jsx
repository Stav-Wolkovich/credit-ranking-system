import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, PageHeader, ErrorBanner } from "../components/ui.jsx";
import MatrixModal from "../components/MatrixModal.jsx";
import DuplicateMatrixModal from "../components/DuplicateMatrixModal.jsx";

const COLUMNS = ["קוד", "שם מטריצה", "סוג", "מודל", "צירים", "תאים", "פעולות"];

export default function MatricesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);

  const loadMatrices = useCallback(() => {
    setLoading(true);
    return api
      .getMatrices()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMatrices();
  }, [loadMatrices]);

  const rows = data?.rows ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeader title="ניהול מטריצות" />
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
          + צור מטריצה
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

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
                  אין מטריצות להצגה.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>{r.id}</td>
                <td style={{ padding: "12px 16px" }}>{r.name}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={r.type} tone="green" />
                </td>
                <td style={{ padding: "12px 16px" }}>{r.model_name}</td>
                <td style={{ padding: "12px 16px" }}>{r.axes}</td>
                <td style={{ padding: "12px 16px" }}>{r.cells}</td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateTarget(r)}
                    aria-label="שכפול"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-mid)" }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", matrix: r })}
                    aria-label="עריכה"
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
        <MatrixModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.matrix : null}
          onCancel={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadMatrices();
          }}
        />
      )}

      {duplicateTarget && (
        <DuplicateMatrixModal
          source={duplicateTarget}
          onCancel={() => setDuplicateTarget(null)}
          onSaved={() => {
            setDuplicateTarget(null);
            loadMatrices();
          }}
        />
      )}
    </div>
  );
}
