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
  return res.json();
}

export const api = {
  getNav: () => request("/nav"),
  getReport: () => request("/report"),
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
};
