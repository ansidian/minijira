import { ApiError, NetworkError } from "./ApiError.js";

export const API_BASE = "/api";

// Re-export error classes for convenient single-file imports
export { ApiError, NetworkError };

/**
 * Handle fetch response, checking status and parsing errors
 */
async function handleResponse(res, method, path) {
  if (res.ok) {
    return res.json();
  }

  // Non-2xx response - extract error message
  let serverMessage = null;
  const contentType = res.headers.get("Content-Type");

  if (contentType && contentType.includes("application/json")) {
    try {
      const errorBody = await res.json();
      serverMessage = errorBody.error || errorBody.message || null;
    } catch {
      // JSON parse failed, fall back to text
      serverMessage = await res.text();
    }
  } else {
    serverMessage = await res.text();
  }

  throw new ApiError(res.status, `${method} ${path}`, serverMessage);
}

/**
 * Wrap fetch call with error handling
 */
async function wrapFetch(fetchPromise, method, path) {
  try {
    const res = await fetchPromise;
    return await handleResponse(res, method, path);
  } catch (error) {
    // If already ApiError, rethrow
    if (error instanceof ApiError) {
      throw error;
    }
    // Otherwise, wrap as NetworkError
    throw new NetworkError(error.message, `${method} ${path}`);
  }
}

export const api = {
  async get(path) {
    return wrapFetch(
      fetch(`${API_BASE}${path}`),
      "GET",
      path
    );
  },
  async post(path, data) {
    return wrapFetch(
      fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      "POST",
      path
    );
  },
  async patch(path, data) {
    return wrapFetch(
      fetch(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      "PATCH",
      path
    );
  },
  async delete(path, data) {
    await wrapFetch(
      fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined,
      }),
      "DELETE",
      path
    );
  },
};
