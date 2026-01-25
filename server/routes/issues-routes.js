import express from "express";
import db from "../db/connection.js";
import sseManager from "../sse-manager.js";
import { logActivity } from "../utils/activity-logger.js";
import { issueSelect, issueSelectWithCounts, subtaskSelect } from "../utils/queries.js";
import { queueNotification } from '../utils/notification-queue.js';

const router = express.Router();

// Cursor pagination helpers
function encodeCursor(row) {
  if (!row) return null;
  return `${row.created_at}|${row.id}`;
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  const [created_at, id] = cursor.split('|');
  return { created_at, id: parseInt(id, 10) };
}

// Normalize query param to array (Express parses repeated params as array)
function toArray(param) {
  if (!param) return null;
  return Array.isArray(param) ? param : [param];
}

router.get("/", async (req, res) => {
  try {
    const { include_subtasks, parent_id, with_counts, cursor, limit: limitParam } = req.query;

    // Multi-value filters (can be string or array)
    const statuses = toArray(req.query.status);
    const assigneeIds = toArray(req.query.assignee_id);
    const priorities = toArray(req.query.priority);

    // Pagination - only enabled when limit is explicitly provided
    const usePagination = limitParam !== undefined;
    const limit = usePagination ? Math.min(Math.max(parseInt(limitParam) || 20, 1), 100) : null;
    const cursorData = usePagination ? decodeCursor(cursor) : null;

    // Default to counts for backwards compatibility
    const baseQuery = with_counts === 'false' ? issueSelect : issueSelectWithCounts;

    let sql = `
      ${baseQuery}
      WHERE 1=1
    `;
    const args = [];

    if (parent_id) {
      sql += " AND issues.parent_id = ?";
      args.push(parent_id);
    } else if (include_subtasks !== "true") {
      sql += " AND issues.parent_id IS NULL";
    }

    // Multi-value status filter (OR logic within)
    if (statuses && statuses.length > 0) {
      const placeholders = statuses.map(() => '?').join(', ');
      sql += ` AND issues.status IN (${placeholders})`;
      args.push(...statuses);
    }

    // Multi-value assignee filter (OR logic, with special handling for '0' = unassigned)
    if (assigneeIds && assigneeIds.length > 0) {
      const hasUnassigned = assigneeIds.includes('0') || assigneeIds.includes(0);
      const numericIds = assigneeIds.filter(id => id !== '0' && id !== 0);

      if (hasUnassigned && numericIds.length > 0) {
        const placeholders = numericIds.map(() => '?').join(', ');
        sql += ` AND (issues.assignee_id IS NULL OR issues.assignee_id IN (${placeholders}))`;
        args.push(...numericIds);
      } else if (hasUnassigned) {
        sql += " AND issues.assignee_id IS NULL";
      } else {
        const placeholders = numericIds.map(() => '?').join(', ');
        sql += ` AND issues.assignee_id IN (${placeholders})`;
        args.push(...numericIds);
      }
    }

    // Multi-value priority filter (OR logic within)
    if (priorities && priorities.length > 0) {
      const placeholders = priorities.map(() => '?').join(', ');
      sql += ` AND issues.priority IN (${placeholders})`;
      args.push(...priorities);
    }

    // Date range filters
    const created_after = req.query.created_after;
    const created_before = req.query.created_before;
    const updated_after = req.query.updated_after;
    const updated_before = req.query.updated_before;

    if (created_after) {
      sql += ` AND datetime(issues.created_at) >= datetime(?)`;
      args.push(created_after);
    }
    if (created_before) {
      sql += ` AND datetime(issues.created_at) <= datetime(?)`;
      args.push(created_before);
    }
    if (updated_after) {
      sql += ` AND datetime(issues.updated_at) >= datetime(?)`;
      args.push(updated_after);
    }
    if (updated_before) {
      sql += ` AND datetime(issues.updated_at) <= datetime(?)`;
      args.push(updated_before);
    }

    // Archive filter - hide archived by default unless show_archived=true
    const showArchived = req.query.show_archived === 'true';
    if (!showArchived) {
      sql += " AND issues.archived_at IS NULL";
    }

    // Cursor-based pagination (keyset pagination)
    if (cursorData) {
      sql += " AND (issues.created_at < ? OR (issues.created_at = ? AND issues.id < ?))";
      args.push(cursorData.created_at, cursorData.created_at, cursorData.id);
    }

    sql += " ORDER BY issues.created_at DESC, issues.id DESC";

    // Fetch limit + 1 to determine hasMore
    if (usePagination) {
      sql += ` LIMIT ?`;
      args.push(limit + 1);
    }

    const { rows } = await db.execute({ sql, args });

    // Backwards compatibility: return array when no limit param
    if (!usePagination) {
      return res.json(rows);
    }

    // Paginated response
    const hasMore = rows.length > limit;
    const issues = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = issues[issues.length - 1];
    const nextCursor = hasMore ? encodeCursor(lastRow) : null;

    res.json({
      issues,
      nextCursor,
      hasMore
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch fetch subtasks for multiple parents in one request
// Must be defined BEFORE /:id routes to avoid :id capturing "subtasks"
router.get("/subtasks/batch", async (req, res) => {
  try {
    const { parent_ids, show_archived } = req.query;

    if (!parent_ids) {
      return res.status(400).json({ error: "parent_ids required" });
    }

    const ids = parent_ids.split(',').map(Number).filter(n => !isNaN(n));

    if (ids.length === 0) {
      return res.status(400).json({ error: "No valid parent IDs" });
    }

    // SQLite IN clause efficient for <1000 items
    const placeholders = ids.map(() => '?').join(',');
    const archiveFilter = show_archived === 'true' ? '' : ' AND issues.archived_at IS NULL';
    const { rows } = await db.execute({
      sql: `
        ${subtaskSelect}
        WHERE issues.parent_id IN (${placeholders})${archiveFilter}
        ORDER BY issues.parent_id, issues.created_at ASC
      `,
      args: ids,
    });

    // Group by parent_id for frontend consumption
    const grouped = {};
    for (const id of ids) {
      grouped[id] = []; // Initialize all requested parents (even if empty)
    }
    for (const subtask of rows) {
      grouped[subtask.parent_id].push(subtask);
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/subtasks", async (req, res) => {
  try {
    const showArchived = req.query.show_archived === 'true';
    const archiveFilter = showArchived ? '' : ' AND issues.archived_at IS NULL';
    const { rows } = await db.execute({
      sql: `
        ${subtaskSelect}
        WHERE issues.parent_id = ?${archiveFilter}
        ORDER BY issues.created_at ASC
      `,
      args: [req.params.id],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    // Default to counts for backwards compatibility
    const query = req.query.with_counts === 'false' ? issueSelect : issueSelectWithCounts;

    const { rows } = await db.execute({
      sql: `
        ${query}
        WHERE issues.id = ?
      `,
      args: [req.params.id],
    });
    if (rows.length === 0)
      return res.status(404).json({ error: "Issue not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignee_id,
      reporter_id,
      parent_id,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (parent_id) {
      const { rows: parentRows } = await db.execute({
        sql: "SELECT id FROM issues WHERE id = ?",
        args: [parent_id],
      });
      if (parentRows.length === 0) {
        return res.status(400).json({ error: "Parent issue not found" });
      }
    }

    const { rows: counterRows } = await db.execute(
      "UPDATE counters SET value = value + 1 WHERE name = 'issue_key' RETURNING value"
    );
    const key = `JPL-${counterRows[0].value}`;

    const result = await db.execute({
      sql: `INSERT INTO issues (key, title, description, status, priority, assignee_id, reporter_id, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        key,
        title,
        description || null,
        status || "todo",
        priority || "medium",
        assignee_id || null,
        reporter_id || null,
        parent_id || null,
      ],
    });

    const { rows } = await db.execute({
      sql: `
        ${issueSelectWithCounts}
        WHERE issues.id = ?
      `,
      args: [result.lastInsertRowid],
    });

    await logActivity(
      result.lastInsertRowid,
      parent_id ? "subtask_created" : "issue_created",
      parent_id ? "subtask" : "issue",
      reporter_id || null,
      null,
      null,
      key,
      title
    );

    sseManager.broadcast({
      type: "issue_created",
      issueId: Number(result.lastInsertRowid),
      parentId: parent_id || undefined,
      userId: reporter_id || null,
    });

    res.status(201).json(rows[0]);

    // Queue notification (don't await - don't block response)
    // Subtasks queue under parent's ID so they merge with parent notifications
    queueNotification(
      parent_id ? Number(parent_id) : Number(result.lastInsertRowid),
      reporter_id || 1,
      'create',
      {
        action_type: parent_id ? 'subtask_created' : 'issue_created',
        issue_key: key,
        issue_title: title,
        description: description || null,
        is_subtask: !!parent_id,
        assignee_id: assignee_id || null,
        assignee_name: rows[0].assignee_name || null
      }
    ).catch(err => {
      console.error('[Queue] Failed to queue issue creation:', err.message);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignee_id,
      parent_id,
      previous_status,
      user_id,
    } = req.body;
    const { id } = req.params;

    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM issues WHERE id = ?",
      args: [id],
    });
    if (existing.length === 0)
      return res.status(404).json({ error: "Issue not found" });

    const oldIssue = { ...existing[0] };

    // Track changes for notification (separate from activity log)
    const notificationChanges = [];

    const updates = [];
    const args = [];

    if (title !== undefined) {
      updates.push("title = ?");
      args.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      args.push(description);
    }
    if (status !== undefined) {
      if (status === "done" && existing[0].status !== "done") {
        updates.push("previous_status = ?");
        args.push(existing[0].status);
      }
      if (status !== "done" && existing[0].status === "done") {
        updates.push("previous_status = ?");
        args.push(null);
        // Clear archive when moving out of done
        updates.push("archived_at = ?");
        args.push(null);
      }
      updates.push("status = ?");
      args.push(status);
    }
    if (previous_status !== undefined) {
      updates.push("previous_status = ?");
      args.push(previous_status || null);
    }
    if (priority !== undefined) {
      updates.push("priority = ?");
      args.push(priority);
    }
    if (assignee_id !== undefined) {
      updates.push("assignee_id = ?");
      args.push(assignee_id || null);
    }
    if (parent_id !== undefined) {
      if (Number(parent_id) === parseInt(id)) {
        return res
          .status(400)
          .json({ error: "Issue cannot be its own parent" });
      }
      updates.push("parent_id = ?");
      args.push(parent_id || null);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      args.push(id);
      await db.execute({
        sql: `UPDATE issues SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });

      if (status !== undefined && oldIssue.status !== status) {
        await logActivity(
          id,
          "status_changed",
          "issue",
          user_id || null,
          oldIssue.status,
          status,
          oldIssue.key,
          title !== undefined ? title : oldIssue.title
        );
      }
      if (priority !== undefined && oldIssue.priority !== priority) {
        await logActivity(
          id,
          "priority_changed",
          "issue",
          user_id || null,
          oldIssue.priority,
          priority,
          oldIssue.key,
          title !== undefined ? title : oldIssue.title
        );
      }
      if (assignee_id !== undefined && oldIssue.assignee_id !== assignee_id) {
        await logActivity(
          id,
          "assignee_changed",
          "issue",
          user_id || null,
          oldIssue.assignee_id?.toString() || null,
          assignee_id?.toString() || null,
          oldIssue.key,
          title !== undefined ? title : oldIssue.title
        );
      }

      // Build notification changes - use structure matching extractChangesFromPayload
      // Each change needs action_type for the recursive parser to work correctly
      if (status !== undefined && oldIssue.status !== status) {
        notificationChanges.push({ action_type: 'status_changed', old_value: oldIssue.status, new_value: status });
      }
      if (assignee_id !== undefined && String(oldIssue.assignee_id) !== String(assignee_id)) {
        notificationChanges.push({ action_type: 'assignee_changed', old_value: oldIssue.assignee_id, new_value: assignee_id });
      }
      if (priority !== undefined && oldIssue.priority !== priority) {
        notificationChanges.push({ action_type: 'priority_changed', old_value: oldIssue.priority, new_value: priority });
      }
      if (title !== undefined && oldIssue.title !== title) {
        notificationChanges.push({ action_type: 'title_changed', old_value: oldIssue.title, new_value: title });
      }
      if (description !== undefined && oldIssue.description !== description) {
        notificationChanges.push({ action_type: 'description_changed', old_value: oldIssue.description, new_value: description });
      }

      // If parent was unarchived (moved out of done), unarchive its subtasks too
      if (status !== undefined && status !== "done" && oldIssue.status === "done" && oldIssue.parent_id === null) {
        await db.execute({
          sql: `UPDATE issues SET archived_at = NULL WHERE parent_id = ?`,
          args: [id]
        });
      }
    }

    const { rows } = await db.execute({
      sql: `
        ${issueSelectWithCounts}
        WHERE issues.id = ?
      `,
      args: [id],
    });

    sseManager.broadcast({
      type: "issue_updated",
      issueId: parseInt(id),
      parentId: rows[0].parent_id || undefined,
      userId: user_id || null,
    });

    res.json(rows[0]);

    // Queue notification only if actual changes occurred
    // Subtasks queue under parent's ID so they merge with parent notifications
    if (notificationChanges.length > 0) {
      const isSubtask = !!oldIssue.parent_id;
      queueNotification(
        isSubtask ? Number(oldIssue.parent_id) : parseInt(id),
        user_id || 1,
        'update',
        {
          action_type: isSubtask ? 'subtask_updated' : 'issue_updated',
          issue_key: oldIssue.key,
          issue_title: title !== undefined ? title : oldIssue.title,
          is_subtask: isSubtask,
          changes: notificationChanges
        }
      ).catch(err => {
        console.error('[Queue] Failed to queue issue update:', err.message);
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_id } = req.body;

    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM issues WHERE id = ?",
      args: [req.params.id],
    });
    if (existing.length === 0)
      return res.status(404).json({ error: "Issue not found" });

    const issue = existing[0];
    const isSubtask = issue.parent_id !== null;

    // Capture subtask count before deletion (for notification)
    let subtaskCount = 0;
    if (!isSubtask) {
      const { rows: subtasks } = await db.execute({
        sql: "SELECT COUNT(*) as count FROM issues WHERE parent_id = ?",
        args: [req.params.id]
      });
      subtaskCount = Number(subtasks[0].count);
    }

    await logActivity(
      issue.id,
      isSubtask ? "subtask_deleted" : "issue_deleted",
      isSubtask ? "subtask" : "issue",
      user_id || null,
      null,
      null,
      issue.key,
      issue.title
    );

    await db.execute({
      sql: "DELETE FROM issues WHERE id = ?",
      args: [req.params.id],
    });

    sseManager.broadcast({
      type: "issue_deleted",
      issueId: parseInt(req.params.id),
      parentId: issue.parent_id || undefined,
      userId: user_id || null,
    });

    res.status(204).send();

    // Queue notification (response already sent, runs async)
    // Subtasks queue under parent's ID so they merge with parent notifications
    queueNotification(
      isSubtask ? Number(issue.parent_id) : Number(req.params.id),
      user_id || 1,
      'delete',
      {
        action_type: isSubtask ? 'subtask_deleted' : 'issue_deleted',
        issue_key: issue.key,
        issue_title: issue.title,
        is_subtask: isSubtask,
        subtasks_deleted: subtaskCount
      }
    ).catch(err => {
      console.error('[Queue] Failed to queue issue deletion:', err.message);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
