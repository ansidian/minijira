import db from '../db/connection.js';

/**
 * Queue a notification for an issue activity event.
 * Uses UPSERT to implement sliding window debounce with max-wait:
 * - 30-second sliding window: each new event resets the timer
 * - 3-minute max-wait: from first event in batch, notification sends regardless
 *
 * @param {number} issueId - The issue ID
 * @param {number} userId - The user who performed the action
 * @param {string} eventType - One of: 'create', 'update', 'delete', 'comment'
 * @param {object} eventPayload - Full event data (will be JSON stringified)
 */
export async function queueNotification(issueId, userId, eventType, eventPayload) {
  // Check if a pending notification already exists for this issue+user
  const existing = await db.execute({
    sql: `
      SELECT id, first_queued_at FROM notification_queue
      WHERE issue_id = ? AND user_id = ? AND status = 'pending'
      LIMIT 1
    `,
    args: [issueId, userId]
  });

  if (existing.rows.length > 0) {
    // Update existing pending notification (sliding window with max-wait cap)
    // scheduled_at = minimum of (now + 30s) or (first_queued_at + 3min)
    await db.execute({
      sql: `
        UPDATE notification_queue
        SET scheduled_at = MIN(
              datetime('now', '+30 seconds'),
              datetime(first_queued_at, '+3 minutes')
            ),
            event_payload = ?,
            event_type = ?
        WHERE id = ?
      `,
      args: [
        JSON.stringify(eventPayload),
        eventType,
        existing.rows[0].id
      ]
    });
  } else {
    // Insert new notification
    // First event: scheduled_at = now + 30s, first_queued_at = now
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
        ) VALUES (?, ?, ?, ?, datetime('now', '+30 seconds'), datetime('now'), 'pending')
      `,
      args: [
        issueId,
        userId,
        eventType,
        JSON.stringify(eventPayload)
      ]
    });
  }
}
