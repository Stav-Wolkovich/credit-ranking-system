import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { PageHeader, ErrorBanner, ConfirmDialog } from "../components/ui.jsx";
import NotificationTypeEmailModal from "../components/NotificationTypeEmailModal.jsx";
import CreateNotificationRuleModal from "../components/CreateNotificationRuleModal.jsx";

const LOG_COLUMNS = ["תאריך ושעה", "סוג התראה", "בוצע על ידי", "הודעה", "ערוצים", "אימייל", "סטטוס שליחה"];
const TYPE_COLUMNS = ["תיאור", "טריגר", "נמען", "ערוץ", "תזמון", "אימייל להתראות", "פעולות"];
const RULE_COLUMNS = ["כותרת", "סוגי אירוע", "נמען", "פעולות"];

const CHANNEL_LABELS = { email: "אימייל", internal: "פנימי" };

const EMAIL_STATUS_STYLES = {
  sent: { label: "נשלח", color: "#1e7e3c" },
  failed: { label: "נכשל", color: "#b52d2d" },
  not_configured: { label: "לא מוגדר", color: "var(--text-light)" },
};

function EmailStatus({ status, error }) {
  if (!status) return <span style={{ color: "var(--text-light)" }}>-</span>;
  const style = EMAIL_STATUS_STYLES[status] ?? { label: status, color: "var(--text-mid)" };
  return (
    <span style={{ color: style.color, fontWeight: 600 }} title={error ?? undefined}>
      {style.label}
    </span>
  );
}

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
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{r.actor_name}</td>
                <td style={{ padding: "12px 16px" }}>{r.message}</td>
                <td style={{ padding: "12px 16px" }}>
                  <ChannelBadges channels={r.channels} />
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }} dir="ltr">
                  {r.email_sent_to ?? "-"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <EmailStatus status={r.email_status} error={r.email_error} />
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
  const [rulesData, setRulesData] = useState(null);
  const [rulesError, setRulesError] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [creatingRule, setCreatingRule] = useState(false);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .getNotificationTypes()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadRules = useCallback(() => {
    setRulesLoading(true);
    return api
      .getNotificationRules()
      .then((res) => setRulesData(res))
      .catch((err) => setRulesError(err.message))
      .finally(() => setRulesLoading(false));
  }, []);

  useEffect(() => {
    load();
    loadRules();
  }, [load, loadRules]);

  const rows = data?.rows ?? [];
  const rules = rulesData?.rows ?? [];

  function confirmDeleteRule() {
    const rule = deleteRuleTarget;
    setDeleteRuleTarget(null);
    api
      .deleteNotificationRule(rule.id)
      .then(() => loadRules())
      .catch((err) => setRulesError(err.message));
  }

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
התראות בערוץ אימייל נשלחות בפועל דרך שרת SMTP המוגדר בקובץ ההגדרות של השרת. אם אין הגדרת SMTP, ההתראה תירשם ביומן עם סטטוס "לא מוגדר" ולא תישלח.
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>התראות מותאמות אישית</div>
        <button
          type="button"
          onClick={() => setCreatingRule(true)}
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
          + יצירת התראה חדשה
        </button>
      </div>

      {rulesError && <ErrorBanner message={rulesError} />}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {RULE_COLUMNS.map((c) => (
                <th key={c} style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "12px 16px", whiteSpace: "nowrap" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rulesLoading && (
              <tr>
                <td colSpan={RULE_COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  טוען נתונים…
                </td>
              </tr>
            )}
            {!rulesLoading && rules.length === 0 && !rulesError && (
              <tr>
                <td colSpan={RULE_COLUMNS.length} style={{ padding: 16, color: "var(--text-light)", textAlign: "center" }}>
                  אין התראות מותאמות אישית מוגדרות.
                </td>
              </tr>
            )}
            {rules.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.title}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {r.types.map((t) => (
                      <span
                        key={t.id}
                        style={{
                          fontSize: 11,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "1px 8px",
                          color: "var(--text-mid)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }} dir="ltr">
                  {r.recipient_email}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteRuleTarget(r)}
                    aria-label="מחיקה"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b52d2d" }}
                  >
                    🗑
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

      {creatingRule && (
        <CreateNotificationRuleModal
          notificationTypes={rows}
          onCancel={() => setCreatingRule(false)}
          onSaved={() => {
            setCreatingRule(false);
            loadRules();
          }}
        />
      )}

      {deleteRuleTarget && (
        <ConfirmDialog
          title="מחיקה"
          message={`למחוק את ההתראה "${deleteRuleTarget.title}"?`}
          onCancel={() => setDeleteRuleTarget(null)}
          onConfirm={confirmDeleteRule}
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
