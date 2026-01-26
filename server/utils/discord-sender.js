/**
 * Discord Sender Module
 *
 * Handles webhook posting with retry logic, rate limiting, and graceful degradation.
 * Prepares notification payloads with subtask summaries and event parsing.
 */

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
 *
 * Supports all MiniJira event types and structures:
 * - update events: status_changed, assignee_changed, priority_changed (with old/new values)
 * - comment events: comment_added (with comment_body)
 * - create events: issue_created (with optional description)
 * - delete events: issue_deleted (with issue metadata)
 * - grouped events: Multiple changes in a single payload (for EMBED-05 batching)
 *
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
    issue_deleted: 'deleted',
    subtask_created: 'created',
    subtask_updated: 'subtask_updated',
    subtask_deleted: 'deleted'
  };

  const changeType = actionTypeMap[actionType] || actionType;

  // Handle different event structures
  if (actionType === 'comment_added') {
    changes.push({
      type: 'comment',
      value: eventPayload.comment_body
    });
  } else if (actionType === 'issue_created' || actionType === 'subtask_created') {
    changes.push({
      type: 'created',
      isSubtask: actionType === 'subtask_created' || eventPayload.is_subtask || false,
      title: eventPayload.issue_title || null
    });
    // Add assignee change if assigned at creation
    if (eventPayload.assignee_name) {
      changes.push({
        type: 'assignee',
        old: null,
        new: eventPayload.assignee_name
      });
    }
  } else if (actionType === 'issue_deleted' || actionType === 'subtask_deleted') {
    changes.push({
      type: 'deleted',
      isSubtask: actionType === 'subtask_deleted' || eventPayload.is_subtask || false,
      title: eventPayload.issue_title || null
    });
  } else if (actionType === 'subtask_updated') {
    // Subtask updates contain a changes array with the actual field changes
    // Process them with isSubtask flag so they're labeled as subtask changes
    if (Array.isArray(eventPayload.changes)) {
      eventPayload.changes.forEach(change => {
        const subChangeType = actionTypeMap[change.action_type] || change.action_type;
        changes.push({
          type: subChangeType,
          old: change.old_value,
          new: change.new_value,
          isSubtask: true,
          subtaskKey: eventPayload.issue_key
        });
      });
    }
  } else if (eventPayload.old_value !== undefined && eventPayload.new_value !== undefined) {
    // Standard update event with old/new values
    // Check for net-zero change (first_old_value exists and equals new_value)
    const firstOld = eventPayload.first_old_value !== undefined
      ? eventPayload.first_old_value
      : eventPayload.old_value;

    // Skip if net-zero change (e.g., todo -> in_progress -> todo)
    if (firstOld !== eventPayload.new_value) {
      changes.push({
        type: changeType,
        old: firstOld,
        new: eventPayload.new_value
      });
    }
  } else if (Array.isArray(eventPayload.changes)) {
    // Handle grouped events (array of changes from merged payloads)
    // Only process if not already handled above (e.g., subtask_updated)
    eventPayload.changes.forEach(change => {
      const subChanges = extractChangesFromPayload(change, eventType);
      changes.push(...subChanges);
    });
  }

  return changes;
}

/**
 * Look up user name by ID
 * @param {number|string} userId - User ID to look up
 * @param {Object} dbClient - Database client
 * @returns {Promise<string|null>} User name or null if not found
 */
async function getUserName(userId, dbClient) {
  if (userId === null || userId === undefined) return null;
  const result = await dbClient.execute({
    sql: 'SELECT name FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows[0]?.name || null;
}

/**
 * Resolve assignee IDs to names in changes array
 * @param {Array} changes - Changes array from extractChangesFromPayload
 * @param {Object} dbClient - Database client
 * @returns {Promise<Array>} Changes with assignee IDs replaced by names
 */
export async function resolveAssigneeNames(changes, dbClient) {
  // Collect unique user IDs to look up
  const userIds = new Set();
  for (const change of changes) {
    if (change.type === 'assignee') {
      if (change.old) userIds.add(change.old);
      if (change.new) userIds.add(change.new);
    }
  }

  if (userIds.size === 0) return changes;

  // Batch lookup all user names
  const userNameMap = new Map();
  for (const userId of userIds) {
    const name = await getUserName(userId, dbClient);
    if (name) userNameMap.set(String(userId), name);
  }

  // Replace IDs with names in changes
  return changes.map(change => {
    if (change.type === 'assignee') {
      return {
        ...change,
        old: change.old ? (userNameMap.get(String(change.old)) || change.old) : change.old,
        new: change.new ? (userNameMap.get(String(change.new)) || change.new) : change.new
      };
    }
    return change;
  });
}

/**
 * Build embed for a single issue from the multi-issue payload
 * @param {Object} issueEntry - Issue entry from payload { issue_id, issue_key, issue_title, changes }
 * @param {Object} user - User object
 * @param {string} timestamp - Notification timestamp
 * @param {Object} dbClient - Database client
 * @returns {Promise<Object|null>} Discord embed object or null if skipped
 */
async function buildIssueEmbed(issueEntry, user, timestamp, dbClient) {
  const { issue_id, issue_key, issue_title, changes: rawChanges } = issueEntry;

  // Fetch current issue data
  const issueResult = await dbClient.execute({
    sql: 'SELECT * FROM issues WHERE id = ?',
    args: [issue_id]
  });

  let issue = issueResult.rows[0];
  let options = {};

  // Handle deleted issues - use payload data
  if (!issue) {
    issue = {
      id: issue_id,
      key: issue_key,
      title: issue_title,
      status: 'deleted'
    };
    options.deleted = true;
  }

  // Get subtask summary if this is a parent issue (not deleted)
  if (!options.deleted && issue.parent_id === null) {
    const subtaskSummary = await getSubtaskSummary(issue_id, dbClient);
    if (subtaskSummary) {
      options.subtaskSummary = subtaskSummary;
    }
  }

  // Extract changes - handle both array of raw changes and pre-processed changes
  let changes = [];
  for (const change of rawChanges) {
    const extracted = extractChangesFromPayload(change, 'update');
    changes.push(...extracted);
  }

  // Resolve assignee IDs to user names for display
  changes = await resolveAssigneeNames(changes, dbClient);

  // Skip if all changes were filtered out (net-zero)
  if (changes.length === 0) {
    return null;
  }

  // Check for created event to add description
  const createdChange = rawChanges.find(c => c.action_type === 'issue_created');
  if (createdChange && createdChange.description) {
    options.description = createdChange.description;
    options.eventType = 'issue_created';
  }

  // Build embed (returns { embeds: [embed] }, extract just the embed)
  const result = buildEmbed(issue, changes, user, timestamp, options);
  return result.embeds[0];
}

/**
 * Prepare complete notification payload from queue row
 * Handles multi-issue payloads, building up to 10 embeds
 * @param {Object} notificationRow - Row from notification_queue table
 * @param {Object} dbClient - Database client
 * @returns {Promise<Object>} Discord webhook payload ready to send
 */
export async function prepareNotificationPayload(notificationRow, dbClient) {
  // Parse event payload
  const eventPayload = JSON.parse(notificationRow.event_payload);

  // Fetch user data
  const userResult = await dbClient.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [notificationRow.user_id]
  });
  const user = userResult.rows[0];

  // Handle multi-issue payload format
  if (eventPayload.issues) {
    const issueIds = Object.keys(eventPayload.issues);

    // Warn if truncating (Discord limit is 10 embeds)
    if (issueIds.length > 10) {
      console.warn(`[Discord] Truncating notification from ${issueIds.length} to 10 issues`);
    }

    const embeds = [];
    for (const issueId of issueIds.slice(0, 10)) {
      const issueEntry = eventPayload.issues[issueId];
      const embed = await buildIssueEmbed(issueEntry, user, notificationRow.scheduled_at, dbClient);
      if (embed) {
        embeds.push(embed);
      }
    }

    // Skip if all issues were filtered out (net-zero)
    if (embeds.length === 0) {
      return { skip: true, reason: 'all issues net-zero' };
    }

    return { embeds };
  }

  // Legacy single-issue payload fallback
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

  // Get subtask summary if this is a parent issue (not deleted)
  if (!options.deleted && issue.parent_id === null) {
    const subtaskSummary = await getSubtaskSummary(notificationRow.issue_id, dbClient);
    if (subtaskSummary) {
      options.subtaskSummary = subtaskSummary;
    }
  }

  // Extract changes from event payload
  let changes = extractChangesFromPayload(eventPayload, notificationRow.event_type);

  // Resolve assignee IDs to user names for display
  changes = await resolveAssigneeNames(changes, dbClient);

  // Skip notification if all changes were filtered out (net-zero)
  if (changes.length === 0) {
    return { skip: true, reason: 'net-zero changes' };
  }

  // Add description for created events
  if (eventPayload.action_type === 'issue_created' && eventPayload.description) {
    options.description = eventPayload.description;
    options.eventType = 'issue_created';
  }

  // Build and return embed
  return buildEmbed(issue, changes, user, notificationRow.scheduled_at, options);
}
