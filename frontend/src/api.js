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
  duplicateQuestionnaire: (id, payload) =>
    request(`/questionnaires/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getApprovals: () => request("/approvals"),
  getRoles: () => request("/roles"),
  createRole: (role) =>
    request("/roles", {
      method: "POST",
      body: JSON.stringify(role),
    }),
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
};
