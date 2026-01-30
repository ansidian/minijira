/**
 * Discord Parent Issue Sender
 *
 * Handles building Discord embeds for parent issue changes.
 */

import { buildEmbed } from './discord-embed-builder.js';
import { filterChangesForNotification } from './discord-filter.js';
import { extractChangesFromPayload, resolveAssigneeNames, getSubtaskSummary } from './discord-sender.js';

/**
 * Build embed for a parent issue
 * @param {Object} issue - Parent issue object from database
 * @param {Array} rawChanges - Raw changes array from payload
 * @param {Object} user - User object
 * @param {string} timestamp - Notification timestamp
 * @param {Object} dbClient - Database client
 * @param {Array} subtaskEntries - Optional subtask change entries to include in embed
 * @returns {Promise<Object|null>} Discord embed object or null if skipped
 */
export async function buildParentIssueEmbed(issue, rawChanges, user, timestamp, dbClient, subtaskEntries = []) {
  let options = {};

  // Get subtask summary (not deleted, is parent)
  if (issue.parent_id === null) {
    const subtaskSummary = await getSubtaskSummary(issue.id, dbClient);
    if (subtaskSummary) {
      options.subtaskSummary = subtaskSummary;
    }
  }

  // Extract parent issue changes
  let changes = [];
  for (const change of rawChanges) {
    const extracted = extractChangesFromPayload(change, "update");
    changes.push(...extracted);
  }

  // Extract and add subtask changes with isSubtask flag
  for (const subtaskEntry of subtaskEntries) {
    const { issue_key: subtaskKey, changes: subtaskRawChanges } = subtaskEntry;

    for (const change of subtaskRawChanges) {
      const extracted = extractChangesFromPayload(change, "update");
      // Mark each change as a subtask change with the subtask key
      for (const extractedChange of extracted) {
        changes.push({
          ...extractedChange,
          isSubtask: true,
          subtaskKey: subtaskKey
        });
      }
    }
  }

  // Resolve assignee IDs to user names for display
  changes = await resolveAssigneeNames(changes, dbClient);

  // Filter changes to only qualifying types
  changes = filterChangesForNotification(changes);

  // Skip if all changes were filtered out
  if (changes.length === 0) {
    return null;
  }

  // Check for created event to add description
  const createdChange = rawChanges.find(
    (c) => c.action_type === "issue_created",
  );
  if (createdChange && createdChange.description) {
    options.description = createdChange.description;
    options.eventType = "issue_created";
  }

  // Check if description was changed (not created)
  const descriptionChange = rawChanges.find(
    (c) => c.action_type === "description_changed",
  );
  if (descriptionChange && descriptionChange.new_value) {
    options.description = descriptionChange.new_value;
    options.descriptionChanged = true;
  }

  // Build embed (returns { embeds: [embed] }, extract just the embed)
  const result = buildEmbed(issue, changes, user, timestamp, options);
  return result.embeds[0];
}
