/**
 * Discord Notification Filter
 *
 * Determines which issue changes should trigger Discord notifications.
 * Filters to only send for:
 * - Status progression to or from review/done
 * - Assignee changes (including new issues created with assignees)
 * - Subtask creation
 */

/**
 * Check if changes should trigger a Discord notification
 *
 * Skip Notifications for:
 * - Status changes FROM 'review'/'done' to other statuses (backward progression)
 * - Priority changes
 * - Other non-qualifying change types
 *
 * @param {Array<{type: string, old: string, new: string, isSubtask?: boolean}>} changes - Changes array from extractChangesFromPayload
 * @returns {boolean} Send notification on True, else skip if False
 */
export function shouldSendNotification(changes) {
  const hasQualifyingChange = changes.some((change) => {
    // Assignee changes (including new issues created with assignees)
    if (change.type === "assignee") {
      return true;
    }

    // Subtask creation
    if (change.type === "created" && change.isSubtask) {
      return true;
    }

    // Status changes: only forward progression to review/done (not backwards)
    if (change.type === "status") {
      const newStatus = change.new;
      const oldStatus = change.old;

      // Must be moving TO review or done
      const isMovingToTarget = newStatus === "review" || newStatus === "done";

      // Disable backward progression (Done -> Review)
      // const isMovingFromTarget = oldStatus === "review" || oldStatus === "done";

      return isMovingToTarget && !isMovingFromTarget;
    }

    // All other change types don't qualify
    return false;
  });

  return hasQualifyingChange;
}

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

    // Keep qualifying status changes (forward to review/done)
    if (change.type === "status") {
      const newStatus = change.new;
      const oldStatus = change.old;
      const isMovingToTarget = newStatus === "review" || newStatus === "done";
      const isMovingFromTarget = oldStatus === "review" || oldStatus === "done";
      return isMovingToTarget && !isMovingFromTarget;
    }

    // Filter out all other changes (priority, etc.)
    return false;
  });
}
