/**
 * Test utilities for MiniJira API tests
 */

const API_BASE = "http://localhost:3001/api";

/**
 * Simple fetch wrapper for API calls
 */
export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async patch(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async delete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  },
};

/**
 * Track created resources for cleanup
 */
export class TestCleanup {
  constructor() {
    this.issueIds = [];
  }

  trackIssue(issueId) {
    this.issueIds.push(issueId);
  }

  async cleanup() {
    // Delete in reverse order (subtasks before parents)
    for (const id of [...this.issueIds].reverse()) {
      try {
        await api.delete(`/issues/${id}`);
      } catch (e) {
        // Ignore errors - issue might already be deleted or cascade deleted
      }
    }
    this.issueIds = [];
  }
}

/**
 * Wait for server to be available
 */
export async function waitForServer(maxAttempts = 10, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await api.get("/users");
      return true;
    } catch (e) {
      if (i === maxAttempts - 1) {
        throw new Error(
          `Server not available after ${maxAttempts} attempts. Make sure 'npm run dev' is running.`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Generate a unique test title
 */
export function uniqueTitle(prefix = "Test Issue") {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
