/**
 * Discord Sender Module
 *
 * Handles webhook posting with retry logic, rate limiting, and graceful degradation.
 * Prepares notification payloads with subtask summaries and event parsing.
 */

import db from '../db/connection.js';
import { buildEmbed } from './discord-embed-builder.js';

/**
 * Sleep helper for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send webhook with exponential backoff retry logic
 * @param {string} url - Discord webhook URL
 * @param {Object} payload - Webhook payload
 * @param {number} maxAttempts - Maximum retry attempts (default 3)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWithRetry(url, payload, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return { success: true };
      }

      // Handle 429 rate limit - respect Retry-After header
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        if (attempt < maxAttempts) {
          await sleep(delay + Math.random() * 1000); // Add jitter
          continue;
        }
      }

      // 4xx errors (except 429) are not retryable
      if (response.status >= 400 && response.status < 500) {
        const text = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${text}` };
      }

      // 5xx errors are retryable
      if (response.status >= 500 && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }

      return { success: false, error: `HTTP ${response.status}` };
    } catch (err) {
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Max attempts exceeded' };
}

/**
 * Get subtask summary for an issue
 * @param {number} issueId - Parent issue ID
 * @param {Object} dbClient - Database client
 * @returns {Promise<string|null>} "X/Y subtasks done" or null if no subtasks
 */
export async function getSubtaskSummary(issueId, dbClient) {
  const result = await dbClient.execute({
    sql: `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
          FROM issues
          WHERE parent_id = ?`,
    args: [issueId]
  });

  const row = result.rows[0];
  const total = Number(row.total);
  const done = Number(row.done) || 0;

  if (total === 0) {
    return null;
  }

  return `${done}/${total} subtasks done`;
}

/**
 * Send Discord notification via webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} embed - Discord embed payload
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendDiscordNotification(webhookUrl, embed) {
  if (!webhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL not set, skipping notification');
    return { success: true };
  }

  return await sendWithRetry(webhookUrl, embed, 3);
}

/**
 * Extract changes array from event payload
 * @param {Object} eventPayload - Parsed event_payload JSON
 * @param {string} eventType - Event type (update, create, delete, comment)
 * @returns {Array<{type, old?, new?, value?}>} Changes array for embed builder
 */
export function extractChangesFromPayload(eventPayload, eventType) {
  const changes = [];
  const actionType = eventPayload.action_type;

  // Map action_type to change type
  const actionTypeMap = {
    status_changed: 'status',
    assignee_changed: 'assignee',
    priority_changed: 'priority',
    comment_added: 'comment',
    issue_created: 'created',
    issue_deleted: 'deleted'
  };

  const changeType = actionTypeMap[actionType] || actionType;

  // Handle different event structures
  if (actionType === 'comment_added') {
    changes.push({
      type: 'comment',
      value: eventPayload.comment_body
    });
  } else if (actionType === 'issue_created') {
    changes.push({
      type: 'created'
    });
  } else if (actionType === 'issue_deleted') {
    changes.push({
      type: 'deleted'
    });
  } else if (eventPayload.old_value !== undefined && eventPayload.new_value !== undefined) {
    // Standard update event with old/new values
    changes.push({
      type: changeType,
      old: eventPayload.old_value,
      new: eventPayload.new_value
    });
  }

  // Handle grouped events (array of changes)
  if (Array.isArray(eventPayload.changes)) {
    eventPayload.changes.forEach(change => {
      const subChanges = extractChangesFromPayload(change, eventType);
      changes.push(...subChanges);
    });
  }

  return changes;
}

/**
 * Prepare complete notification payload from queue row
 * @param {Object} notificationRow - Row from notification_queue table
 * @param {Object} dbClient - Database client
 * @returns {Promise<Object>} Discord webhook payload ready to send
 */
export async function prepareNotificationPayload(notificationRow, dbClient) {
  // Parse event payload
  const eventPayload = JSON.parse(notificationRow.event_payload);

  // Fetch issue data
  const issueResult = await dbClient.execute({
    sql: 'SELECT * FROM issues WHERE id = ?',
    args: [notificationRow.issue_id]
  });

  let issue = issueResult.rows[0];
  let options = {};

  // Handle deleted issues - use event_payload data
  if (!issue) {
    issue = {
      id: notificationRow.issue_id,
      key: eventPayload.issue_key,
      title: eventPayload.issue_title,
      status: 'deleted'
    };
    options.deleted = true;
  }

  // Fetch user data
  const userResult = await dbClient.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [notificationRow.user_id]
  });
  const user = userResult.rows[0];

  // Get subtask summary if this is a parent issue (not deleted)
  if (!options.deleted && issue.parent_id === null) {
    const subtaskSummary = await getSubtaskSummary(notificationRow.issue_id, dbClient);
    if (subtaskSummary) {
      options.subtaskSummary = subtaskSummary;
    }
  }

  // Extract changes from event payload
  const changes = extractChangesFromPayload(eventPayload, notificationRow.event_type);

  // Add description for created events
  if (eventPayload.action_type === 'issue_created' && eventPayload.description) {
    options.description = eventPayload.description;
    options.eventType = 'issue_created';
  }

  // Build and return embed
  return buildEmbed(issue, changes, user, notificationRow.scheduled_at, options);
}
