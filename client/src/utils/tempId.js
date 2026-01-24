/**
 * Generates a collision-resistant temporary ID for optimistic creates.
 * Format: "temp-{uuid}" to distinguish from server IDs.
 *
 * Uses crypto.randomUUID() which provides 128-bit collision resistance.
 * Never use Date.now() or incrementing counters - they can collide.
 *
 * @returns {string} Temporary ID in format "temp-{uuid}"
 */
export function generateTempId() {
  return `temp-${crypto.randomUUID()}`;
}

/**
 * Checks if an ID is a temporary (optimistic) ID.
 *
 * @param {string|number} id - The ID to check
 * @returns {boolean} True if ID is temporary
 */
export function isTempId(id) {
  return typeof id === "string" && id.startsWith("temp-");
}
