/**
 * Discord Subtask Sender
 *
 * Handles building Discord embeds for standalone subtask changes
 * (when the parent issue is not in the same notification batch).
 */

import { buildEmbed } from "./discord-embed-builder.js";
import { filterChangesForNotification } from "./discord-filter.js";
import {
  extractChangesFromPayload,
  resolveAssigneeNames,
} from "./discord-sender.js";

/**
 * Build embed for a standalone subtask (parent not in batch)
 * @param {Object} _parentIssue - Parent issue object (unused, kept for API compatibility)
 * @param {Array} rawChanges - Raw changes array from payload (contains subtask info)
 * @param {Object} user - User object
 * @param {string} timestamp - Notification timestamp
 * @param {Object} dbClient - Database client
 * @returns {Promise<Object|null>} Discord embed object or null if skipped
 */
export async function buildSubtaskEmbed(
  _parentIssue,
  rawChanges,
  user,
  timestamp,
  dbClient,
) {
  // Find the subtask_updated payload to get subtask key/title
  const subtaskPayload = rawChanges.find(
    (c) => c.action_type === "subtask_updated",
  );
  if (!subtaskPayload) {
    return null; // unlikely edge case
  }

  // Fetch the subtask to get its current status for embed color
  const subtaskResult = await dbClient.execute({
    sql: "SELECT * FROM issues WHERE key = ?",
    args: [subtaskPayload.issue_key],
  });
  const subtask = subtaskResult.rows[0];

  // If subtask not found, skip notification
  if (!subtask) {
    console.log(
      `[Discord] Subtask ${subtaskPayload.issue_key} not found, skipping`,
    );
    return null;
  }

  // Extract changes
  let changes = [];
  for (const change of rawChanges) {
    const extracted = extractChangesFromPayload(change, "update");
    changes.push(...extracted);
  }

  // Resolve assignee IDs to user names for display
  changes = await resolveAssigneeNames(changes, dbClient);

  // Filter changes to only qualifying types
  changes = filterChangesForNotification(changes);

  // Skip if all changes were filtered out
  if (changes.length === 0) {
    return null;
  }

  // Strip isSubtask/subtaskKey flags since the title already identifies this as a subtask
  // This prevents "└─ [JPL-2] Status" field names when the title is "[JPL-2] ... (Subtask)"
  changes = changes.map((change) => {
    const { isSubtask, subtaskKey, ...rest } = change;
    return rest;
  });

  // Build subtask issue object for embed builder
  const subtaskIssue = {
    id: subtask.id,
    key: subtask.key,
    title: subtask.title,
    status: subtask.status,
  };

  // Mark as subtask for embed builder (adds "(Subtask)" to title)
  const options = {
    isSubtask: true,
  };

  // Check for description change
  const descriptionChange = rawChanges.find(
    (c) => c.action_type === "description_changed",
  );
  if (descriptionChange && descriptionChange.new_value) {
    options.description = descriptionChange.new_value;
    options.descriptionChanged = true;
  }

  // Build embed (returns { embeds: [embed] }, extract just the embed)
  const result = buildEmbed(subtaskIssue, changes, user, timestamp, options);
  return result.embeds[0];
}
