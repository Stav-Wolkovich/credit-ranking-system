export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Lower computed/final score = a better rating (matches the STANDARD rating
// scale: AAA sits at the low end of the range, D at the high end), so a
// decrease from the previous ranking in the list is an improvement.
export function rankingChangeDirection(current, previous) {
  if (previous == null || current == null) return null;
  if (current < previous) return "up";
  if (current > previous) return "down";
  return null;
}

function entityDetailHtml(preview) {
  const { entity, rankings } = preview;
  let html = `<p><strong>ישות:</strong> ${escapeHtml(entity.name)} (${escapeHtml(entity.id)})</p>`;
  if (rankings.length === 0) {
    html += `<p>לא נמצאו תהליכי דירוג עבור ישות זו.</p>`;
  }
  rankings.forEach((r) => {
    html += `
      <h3>${escapeHtml(r.code)} — ${escapeHtml(r.model ?? "-")}</h3>
      <p>סטטוס: ${escapeHtml(r.status)} | צוות: ${escapeHtml(r.team ?? "-")}</p>
      <p>ציון מחושב: ${escapeHtml(r.computed_score ?? "-")} (${escapeHtml(r.computed_rating ?? "-")}) |
         ציון סופי: ${escapeHtml(r.final_score ?? "-")} (${escapeHtml(r.final_rating ?? "-")})</p>
      <p>תוקף: ${escapeHtml(r.valid_from ?? "-")} עד ${escapeHtml(r.valid_until ?? "-")}</p>`;
    if (r.questionnaire_groups.length > 0) {
      html += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:13px;margin-bottom:12px;">
        <thead><tr><th>קבוצת שאלון</th><th>משקל</th></tr></thead>
        <tbody>${r.questionnaire_groups
          .map((g) => `<tr><td>${escapeHtml(g.name)}</td><td>${g.weight}%</td></tr>`)
          .join("")}</tbody>
      </table>`;
    }
  });
  html += `<p style="color:#888;">פירוט תשובות, היסטוריית אישורים ומסלול אודיט אינם זמינים במערכת עבור ישות זו.</p>`;
  return html;
}

function entityComparisonHtml(preview) {
  const cols = preview.rankings;
  const fieldRows = [
    ["מודל", "model"],
    ["צוות", "team"],
    ["סטטוס", "status"],
    ["ציון מחושב", "computed_score"],
    ["דירוג מחושב", "computed_rating"],
    ["ציון סופי", "final_score"],
    ["דירוג סופי", "final_rating"],
    ["תוקף מ-", "valid_from"],
    ["תוקף עד", "valid_until"],
  ];
  let html = `<p><strong>ישות:</strong> ${escapeHtml(preview.entity.name)} (${escapeHtml(preview.entity.id)})</p>`;
  if (cols.length === 0) {
    return html + `<p>לא נמצאו תהליכי דירוג עבור ישות זו.</p>`;
  }
  html += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:13px;">
    <thead><tr><th></th>${cols.map((c) => `<th>${escapeHtml(c.code)}</th>`).join("")}</tr></thead>
    <tbody>${fieldRows
      .map(([label, key]) => {
        const cells = cols
          .map((c, i) => {
            let color = "";
            if ((key === "computed_score" || key === "computed_rating") && i > 0) {
              const dir = rankingChangeDirection(cols[i].computed_score, cols[i - 1].computed_score);
              if (dir === "up") color = "color:#1e7e3c;font-weight:bold;";
              if (dir === "down") color = "color:#b52d2d;font-weight:bold;";
            }
            if ((key === "final_score" || key === "final_rating") && i > 0) {
              const dir = rankingChangeDirection(cols[i].final_score, cols[i - 1].final_score);
              if (dir === "up") color = "color:#1e7e3c;font-weight:bold;";
              if (dir === "down") color = "color:#b52d2d;font-weight:bold;";
            }
            return `<td style="${color}">${escapeHtml(c[key])}</td>`;
          })
          .join("");
        return `<tr><td><strong>${label}</strong></td>${cells}</tr>`;
      })
      .join("")}</tbody>
  </table>`;
  return html;
}

export function buildReportPrintHtml(report, preview) {
  let contentHtml;
  if (preview.type === "table") {
    contentHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead><tr>${preview.columns
          .map((c) => `<th style="background:#1a2542;color:#fff;">${escapeHtml(c.label)}</th>`)
          .join("")}</tr></thead>
        <tbody>${preview.rows
          .map(
            (row) =>
              `<tr>${preview.columns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join("")}</tr>`
          )
          .join("")}</tbody>
      </table>`;
  } else if (preview.type === "distribution") {
    const section = (title, counts) => `
      <h3>${escapeHtml(title)}</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tbody>${Object.entries(counts)
          .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`)
          .join("")}</tbody>
      </table>`;
    contentHtml = section("לפי דירוג", preview.by_rating) + section("לפי מודל", preview.by_model);
  } else if (preview.type === "entity_detail") {
    contentHtml = entityDetailHtml(preview);
  } else if (preview.type === "entity_comparison") {
    contentHtml = entityComparisonHtml(preview);
  } else {
    contentHtml = `
      <p><strong>מטרה:</strong> ${escapeHtml(preview.purpose)}</p>
      <p><strong>תוכן:</strong> ${escapeHtml(preview.content)}</p>`;
  }
  return `<!doctype html>
    <html dir="rtl" lang="he">
      <head><meta charset="utf-8"><title>${escapeHtml(report.id)} - ${escapeHtml(report.title)}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>${escapeHtml(report.id)}: ${escapeHtml(report.title)}</h2>
        ${contentHtml}
      </body>
    </html>`;
}
