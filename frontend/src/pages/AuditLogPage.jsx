import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { PageHeader, ErrorBanner } from "../components/ui.jsx";
import NotificationTypeEmailModal from "../components/NotificationTypeEmailModal.jsx";

const LOG_COLUMNS = ["תאריך ושעה", "סוג התראה", "הודעה", "ערוצים", "נשלח לאימייל"];
const TYPE_COLUMNS = ["תיאור", "טריגר", "נמען", "ערוץ", "תזמון", "אימייל להתראות", "פעולות"];

const CHANNEL_LABELS = { email: "אימייל", internal: "פנימי" };

const TABS = [
  { id: "log", label: "יומן התראות" },
  { id: "types", label: "סוגי התראות" },
];

function ChannelBadges({ channels }) {
  if (!channels || channels.length === 0) return <span>-</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {channels.map((c) => (
        <span
          key={c}
          style={{
            fontSize: 11,
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1px 8px",
            color: "var(--text-mid)",
            whiteSpace: "nowrap",
          }}
        >
          {CHANNEL_LABELS[c] ?? c}
        </span>
      ))}
    </div>
  );
}

function NotificationLogTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .getNotifications()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows ?? [];

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {LOG_COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px", whiteSpace: "nowrap" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={LOG_COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={LOG_COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין התראות ביומן.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{r.created_at.replace("T", " ")}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{r.type_name}</td>
                <td style={{ padding: "12px 16px" }}>{r.message}</td>
                <td style={{ padding: "12px 16px" }}>
                  <ChannelBadges channels={r.channels} />
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }} dir="ltr">
                  {r.email_sent_to ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotificationTypesTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .getNotificationTypes()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows ?? [];

  return (
    <div>
      <div
        style={{
          background: "#f0f5fb",
          color: "var(--text-mid)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12.5,
          marginBottom: 14,
        }}
      >
        אין במערכת זו חיבור לשרת דואר — התראות בערוץ אימייל נרשמות ביומן עם כתובת היעד המוגדרת, אך לא נשלח מייל בפועל.
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {TYPE_COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px", whiteSpace: "nowrap" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={TYPE_COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{t.name}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }}>{t.trigger_description}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{t.recipient_role}</td>
                <td style={{ padding: "12px 16px" }}>
                  <ChannelBadges channels={t.channels} />
                </td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{t.timing}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }} dir="ltr">
                  {t.notification_email ?? "-"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setEditTarget(t)}
                    aria-label="עריכת אימייל"
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

      {editTarget && (
        <NotificationTypeEmailModal
          notificationType={editTarget}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [tab, setTab] = useState("log");

  return (
    <div>
      <PageHeader title="יומן ביקורת" />

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

      {tab === "log" ? <NotificationLogTab /> : <NotificationTypesTab />}
    </div>
  );
}
