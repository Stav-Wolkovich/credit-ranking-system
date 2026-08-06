"""
Real SMTP email delivery for the notification system, configured entirely
via environment variables (see .env.example) so credentials never end up
in source control. Works with any standard SMTP provider (Gmail, Outlook/
Microsoft 365, a company mail server, SendGrid's SMTP relay, etc.) — there's
nothing provider-specific here.

If SMTP_HOST/SMTP_PORT/SMTP_FROM aren't set, send_email() returns
(False, "not_configured", <explanation>) rather than raising, so a missing
.env degrades to "logged but not sent" instead of crashing whatever
triggered the notification.
"""
import os
import smtplib
from email.mime.text import MIMEText


def send_email(to_address: str, subject: str, body: str) -> tuple[bool, str, str | None]:
    """Returns (sent, status, error). status is one of:
    'sent', 'not_configured', 'failed'."""
    host = os.environ.get("SMTP_HOST")
    port = os.environ.get("SMTP_PORT")
    from_addr = os.environ.get("SMTP_FROM")
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    use_tls = os.environ.get("SMTP_USE_TLS", "true").strip().lower() != "false"

    if not host or not port or not from_addr:
        return (
            False,
            "not_configured",
            "SMTP אינו מוגדר — יש להגדיר SMTP_HOST, SMTP_PORT ו-SMTP_FROM בקובץ backend/.env",
        )

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_address

    try:
        with smtplib.SMTP(host, int(port), timeout=10) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.sendmail(from_addr, [to_address], msg.as_string())
        return True, "sent", None
    except Exception as e:
        return False, "failed", str(e)
