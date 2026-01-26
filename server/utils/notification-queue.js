import db from '../db/connection.js';

// Timing configuration for notification debouncing
const DEBOUNCE_WINDOW = '+60 seconds';  // Sliding window - each new event resets timer
const MAX_WAIT = '+3 minutes';          // Maximum wait from first event in batch

/**
 * Merge a single change into a changes array.
 * Deduplicates by action_type (later change of same type wins).
 * Preserves the first old_value for net-zero change detection.
 * @param {Array} changes - Existing changes array
 * @param {object} newChange - New change to merge
 */
function mergeChange(changes, newChange) {
  const existingIndex = changes.findIndex(c => c.action_type === newChange.action_type);

  if (existingIndex >= 0) {
    // Replace existing change of same type, but preserve the original old_value
    // This allows us to detect net-zero changes (e.g., todo -> in_progress -> todo)
    const existingChange = changes[existingIndex];
    const firstOldValue = existingChange.first_old_value !== undefined
      ? existingChange.first_old_value
      : existingChange.old_value;

    changes[existingIndex] = {
      ...newChange,
      first_old_value: firstOldValue
    };
  } else {
    // Add new change type
    changes.push(newChange);
  }
}

/**
 * Merge a new event into an existing payload's changes array.
 * Handles both flat events and nested events (issue_updated with inner changes array).
 * Deduplicates by action_type (later change of same type wins).
 * Preserves the first old_value for net-zero change detection.
 * @param {object} existingPayload - Existing event_payload from queue
 * @param {object} newPayload - New event to merge
 * @returns {object} Merged payload with changes array
 */
function mergePayloads(existingPayload, newPayload) {
  // Get existing changes array, or convert single event to array
  let changes = existingPayload.changes || [existingPayload];

  // If newPayload has its own changes array (e.g., issue_updated events),
  // merge each inner change individually instead of the wrapper object
  if (Array.isArray(newPayload.changes)) {
    for (const innerChange of newPayload.changes) {
      mergeChange(changes, innerChange);
    }
  } else {
    // Simple event without nested changes
    mergeChange(changes, newPayload);
  }

  return { changes };
}

/**
 * Queue a notification for an issue activity event.
 * Uses UPSERT to implement sliding window debounce with max-wait:
 * - DEBOUNCE_WINDOW: each new event resets the timer
 * - MAX_WAIT: from first event in batch, notification sends regardless
 * - Multiple changes within window are merged into a single notification
 *
 * @param {number} issueId - The issue ID
 * @param {number} userId - The user who performed the action
 * @param {string} eventType - One of: 'create', 'update', 'delete', 'comment'
 * @param {object} eventPayload - Full event data (will be JSON stringified)
 */
export async function queueNotification(issueId, userId, eventType, eventPayload) {
  // Skip notification if no user - prevents "System" notifications
  if (!userId) {
    console.warn(`[Queue] Skipping notification for issue ${issueId} - no user_id`);
    return;
  }

  // Check if a pending notification already exists for this issue+user
  const existing = await db.execute({
    sql: `
      SELECT id, first_queued_at, event_payload FROM notification_queue
      WHERE issue_id = ? AND user_id = ? AND status = 'pending'
      LIMIT 1
    `,
    args: [issueId, userId],
  });

  if (existing.rows.length > 0) {
    // Merge new change into existing payload
    const existingPayload = JSON.parse(existing.rows[0].event_payload);
    const mergedPayload = mergePayloads(existingPayload, eventPayload);

    // Update existing pending notification (sliding window with max-wait cap)
    // scheduled_at = minimum of (now + DEBOUNCE_WINDOW) or (first_queued_at + MAX_WAIT)
    await db.execute({
      sql: `
        UPDATE notification_queue
        SET scheduled_at = MIN(
              datetime('now', '${DEBOUNCE_WINDOW}'),
              datetime(first_queued_at, '${MAX_WAIT}')
            ),
            event_payload = ?,
            event_type = ?
        WHERE id = ?
      `,
      args: [JSON.stringify(mergedPayload), eventType, existing.rows[0].id],
    });
  } else {
    // Insert new notification
    // First event: scheduled_at = now + DEBOUNCE_WINDOW, first_queued_at = now
    await db.execute({
      sql: `
        INSERT INTO notification_queue (
          issue_id,
          user_id,
          event_type,
          event_payload,
          scheduled_at,
          first_queued_at,
          status
        ) VALUES (?, ?, ?, ?, datetime('now', '${DEBOUNCE_WINDOW}'), datetime('now'), 'pending')
      `,
      args: [issueId, userId, eventType, JSON.stringify(eventPayload)],
    });
  }
}
