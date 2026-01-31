/**
 * Discord Notification Filter
 *
 * Determines which issue changes should trigger Discord notifications.
 * Filters to only send for:
 * - Status changes TO review/done (any direction)
 * - Assignee changes (including new issues created with assignees)
 * - Subtask creation
 */

/**
 * Filter changes to only those that should appear in Discord notification
 *
 * Keeps only qualifying changes (status to review/done, assignee changes).
 * This ensures the embed only shows relevant information.
 *
 * @param {Array<{type: string, old: string, new: string, isSubtask?: boolean}>} changes - Changes array
 * @returns {Array<{type: string, old: string, new: string, isSubtask?: boolean}>} Filtered changes
 */
export function filterChangesForNotification(changes) {
  return changes.filter((change) => {
    // Keep assignee changes
    if (change.type === "assignee") {
      return true;
    }

    // Keep subtask creation
    if (change.type === "created" && change.isSubtask) {
      return true;
    }

    // Keep qualifying status changes (to review/done, including backward from done to review)
    if (change.type === "status") {
      const newStatus = change.new;
      const isMovingToTarget = newStatus === "review" || newStatus === "done";
      return isMovingToTarget;
    }

    // Filter out all other changes (priority, etc.)
    return false;
  });
}
