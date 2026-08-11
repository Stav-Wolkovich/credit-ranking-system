const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.detail) message = parsed.detail;
    } catch {
      // body wasn't JSON — fall back to the raw text set above
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getNav: () => request("/nav"),
  getReport: () => request("/report"),
  getExpiringSoon: (expiringWithinDays) => request(`/report/expiring-soon?expiring_within_days=${expiringWithinDays}`),
  updateRowStatus: (id, status, tone) =>
    request(`/report/rows/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, tone }),
    }),
  getProcesses: () => request("/processes"),
  createProcess: (process) =>
    request("/processes", {
      method: "POST",
      body: JSON.stringify(process),
    }),
  getProcessScoring: (id) => request(`/processes/${id}/scoring`),
  saveProcessAnswer: (id, payload) =>
    request(`/processes/${id}/answers`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  applyProcessStatusAction: (id, action) =>
    request(`/processes/${id}/status-action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  getIssuers: () => request("/issuers"),
  createIssuer: (issuer) =>
    request("/issuers", {
      method: "POST",
      body: JSON.stringify(issuer),
    }),
  updateIssuer: (id, issuer) =>
    request(`/issuers/${id}`, {
      method: "PUT",
      body: JSON.stringify(issuer),
    }),
  deleteIssuer: (id) => request(`/issuers/${id}`, { method: "DELETE" }),
  getAssets: () => request("/assets"),
  createAsset: (asset) =>
    request("/assets", {
      method: "POST",
      body: JSON.stringify(asset),
    }),
  updateAsset: (id, asset) =>
    request(`/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(asset),
    }),
  getTeams: () => request("/teams"),
  createTeam: (team) =>
    request("/teams", {
      method: "POST",
      body: JSON.stringify(team),
    }),
  updateTeam: (id, team) =>
    request(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(team),
    }),
  getModels: () => request("/models"),
  createModel: (model) =>
    request("/models", {
      method: "POST",
      body: JSON.stringify(model),
    }),
  updateModel: (id, model) =>
    request(`/models/${id}`, {
      method: "PUT",
      body: JSON.stringify(model),
    }),
  deleteModel: (id) => request(`/models/${id}`, { method: "DELETE" }),
  updateModelStatus: (id, payload) =>
    request(`/models/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getRatingScales: () => request("/rating-scales"),
  getRatingScale: (id) => request(`/rating-scales/${id}`),
  createRatingScale: (scale) =>
    request("/rating-scales", {
      method: "POST",
      body: JSON.stringify(scale),
    }),
  updateRatingScale: (id, scale) =>
    request(`/rating-scales/${id}`, {
      method: "PUT",
      body: JSON.stringify(scale),
    }),
  deleteRatingScale: (id) => request(`/rating-scales/${id}`, { method: "DELETE" }),
  getQuestionnaires: () => request("/questionnaires"),
  getQuestionnaire: (id) => request(`/questionnaires/${id}`),
  createQuestionnaire: (questionnaire) =>
    request("/questionnaires", {
      method: "POST",
      body: JSON.stringify(questionnaire),
    }),
  updateQuestionnaire: (id, questionnaire) =>
    request(`/questionnaires/${id}`, {
      method: "PUT",
      body: JSON.stringify(questionnaire),
    }),
  deleteQuestionnaire: (id) => request(`/questionnaires/${id}`, { method: "DELETE" }),
  updateQuestionnaireStatus: (id, payload) =>
    request(`/questionnaires/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  duplicateQuestionnaire: (id, payload) =>
    request(`/questionnaires/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getManagerApprovals: () => request("/approvals/manager"),
  getCommitteeApprovals: () => request("/approvals/committee"),
  approveManagerProcess: (id) => request(`/approvals/${id}/approve-manager`, { method: "POST" }),
  approveCommitteeProcess: (id) => request(`/approvals/${id}/approve-committee`, { method: "POST" }),
  rejectManagerProcess: (id, payload) =>
    request(`/approvals/${id}/reject-manager`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  rejectCommitteeProcess: (id, payload) =>
    request(`/approvals/${id}/reject-committee`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRoles: () => request("/roles"),
  createRole: (role) =>
    request("/roles", {
      method: "POST",
      body: JSON.stringify(role),
    }),
  updateRole: (id, role) =>
    request(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(role),
    }),
  deleteRole: (id) => request(`/roles/${id}`, { method: "DELETE" }),
  getUsers: () => request("/users"),
  createUser: (user) =>
    request("/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),
  updateUser: (id, user) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    }),
  getMatrices: () => request("/matrices"),
  getMatrix: (id) => request(`/matrices/${id}`),
  createMatrix: (matrix) =>
    request("/matrices", {
      method: "POST",
      body: JSON.stringify(matrix),
    }),
  updateMatrix: (id, matrix) =>
    request(`/matrices/${id}`, {
      method: "PUT",
      body: JSON.stringify(matrix),
    }),
  duplicateMatrix: (id, payload) =>
    request(`/matrices/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getReports: () => request("/reports"),
  createReport: (report) =>
    request("/reports", {
      method: "POST",
      body: JSON.stringify(report),
    }),
  updateReport: (id, report) =>
    request(`/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(report),
    }),
  previewReport: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/${id}/preview${qs ? `?${qs}` : ""}`);
  },
  getNotificationTypes: () => request("/notification-types"),
  updateNotificationType: (id, payload) =>
    request(`/notification-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getNotifications: () => request("/notifications"),
};
