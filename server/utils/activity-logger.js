import db from "../db/connection.js";

const ACTIVITY_LOG_LIMIT = 20;

export async function logActivity(
  issueId,
  actionType,
  entityType,
  userId,
  oldValue = null,
  newValue = null,
  issueKey = null,
  issueTitle = null
) {
  await db.execute({
    sql: `INSERT INTO activity_log (issue_id, action_type, entity_type, user_id, old_value, new_value, issue_key, issue_title)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      issueId,
      actionType,
      entityType,
      userId,
      oldValue,
      newValue,
      issueKey,
      issueTitle,
    ],
  });

  await db.execute({
    sql: `DELETE FROM activity_log WHERE id NOT IN (
            SELECT id FROM activity_log ORDER BY created_at DESC LIMIT ?
          )`,
    args: [ACTIVITY_LOG_LIMIT],
  });
}
