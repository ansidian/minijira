import db from '../db/connection.js';

// Timing configuration for notification debouncing
const DEBOUNCE_WINDOW = '+150 seconds';  // Sliding window - each new event resets timer
const MAX_WAIT = '+5 minutes';          // Maximum wait from first event in batch

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
 * Merge changes for a single issue within the multi-issue payload.
 * @param {object} issueEntry - Existing issue entry { issue_id, changes: [...] }
 * @param {object} newPayload - New event payload for this issue
 * @returns {object} Updated issue entry
 */
function mergeIssueChanges(issueEntry, newPayload) {
  const changes = [...issueEntry.changes];

  // If newPayload has its own changes array (e.g., issue_updated events),
  // merge each inner change individually
  if (Array.isArray(newPayload.changes)) {
    for (const innerChange of newPayload.changes) {
      mergeChange(changes, innerChange);
    }
  } else {
    // Simple event without nested changes
    mergeChange(changes, newPayload);
  }

  return { ...issueEntry, changes };
}

/**
 * Merge a new event into the multi-issue payload structure.
 * Payload format: { issues: { [issueId]: { issue_id, issue_key, issue_title, changes: [...] } } }
 * @param {object} existingPayload - Existing event_payload from queue
 * @param {number} issueId - Issue ID for the new event
 * @param {object} newPayload - New event to merge
 * @returns {object} Merged payload with issues object
 */
function mergePayloads(existingPayload, issueId, newPayload) {
  // Initialize or get existing issues object
  let issues = existingPayload.issues || {};

  // Handle legacy single-issue payloads (migrate to new format)
  if (!existingPayload.issues && (existingPayload.changes || existingPayload.action_type)) {
    // This is an old-style single-issue payload, convert it
    const legacyIssueId = existingPayload.issue_id || issueId;
    issues[legacyIssueId] = {
      issue_id: legacyIssueId,
      issue_key: existingPayload.issue_key,
      issue_title: existingPayload.issue_title,
      changes: existingPayload.changes || [existingPayload]
    };
  }

  const issueIdStr = String(issueId);

  if (issues[issueIdStr]) {
    // Merge into existing issue entry
    issues[issueIdStr] = mergeIssueChanges(issues[issueIdStr], newPayload);
  } else {
    // Add new issue entry
    const changes = Array.isArray(newPayload.changes) ? newPayload.changes : [newPayload];
    issues[issueIdStr] = {
      issue_id: issueId,
      issue_key: newPayload.issue_key,
      issue_title: newPayload.issue_title,
      changes
    };
  }

  return { issues };
}

/**
 * Queue a notification for an issue activity event.
 * Uses UPSERT to implement sliding window debounce with max-wait:
 * - DEBOUNCE_WINDOW: each new event resets the timer
 * - MAX_WAIT: from first event in batch, notification sends regardless
 * - Multiple changes within window are merged into a single notification
 * - Changes across different issues within window are batched together
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

  // Check if a pending notification already exists for this user (any issue)
  const existing = await db.execute({
    sql: `
      SELECT id, first_queued_at, event_payload FROM notification_queue
      WHERE user_id = ? AND status = 'pending'
      LIMIT 1
    `,
    args: [userId],
  });

  if (existing.rows.length > 0) {
    // Merge new change into existing payload (may be same or different issue)
    const existingPayload = JSON.parse(existing.rows[0].event_payload);
    const mergedPayload = mergePayloads(existingPayload, issueId, eventPayload);

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
    // Insert new notification with multi-issue payload structure
    const initialPayload = {
      issues: {
        [issueId]: {
          issue_id: issueId,
          issue_key: eventPayload.issue_key,
          issue_title: eventPayload.issue_title,
          changes: Array.isArray(eventPayload.changes) ? eventPayload.changes : [eventPayload]
        }
      }
    };

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
      args: [null, userId, eventType, JSON.stringify(initialPayload)],
    });
  }
}
