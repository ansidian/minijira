/**
 * Custom error for HTTP errors (4xx, 5xx responses)
 */
export class ApiError extends Error {
  constructor(status, endpoint, serverMessage) {
    const message = `HTTP ${status}: ${serverMessage || 'Request failed'} [${endpoint}]`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.serverMessage = serverMessage;
    this.category = status >= 400 && status < 500 ? "client" : "server";
  }
}

/**
 * Custom error for network failures (offline, DNS, connection issues)
 */
export class NetworkError extends Error {
  constructor(originalMessage, endpoint) {
    super(originalMessage);
    this.name = "NetworkError";
    this.endpoint = endpoint;
    this.category = "network";
  }
}
