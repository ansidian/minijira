export const API_BASE = "/api";

export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  },
  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async patch(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(path, data) {
    await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};
