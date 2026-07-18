const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
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
};
