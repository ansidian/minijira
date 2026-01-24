import db from '../db/connection.js';

/**
 * Queue a notification for an issue activity event.
 * Uses UPSERT to implement sliding window debounce:
 * - New events insert with 10-minute scheduled_at
 * - Duplicate events (same issue + user) reset the timer
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
      SELECT id FROM notification_queue
      WHERE issue_id = ? AND user_id = ? AND status = 'pending'
      LIMIT 1
    `,
    args: [issueId, userId]
  });

  if (existing.rows.length > 0) {
    // Update existing pending notification (sliding window)
    await db.execute({
      sql: `
        UPDATE notification_queue
        SET scheduled_at = datetime('now', '+10 minutes'),
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
    await db.execute({
      sql: `
        INSERT INTO notification_queue (
          issue_id,
          user_id,
          event_type,
          event_payload,
          scheduled_at,
          status
        ) VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'), 'pending')
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
