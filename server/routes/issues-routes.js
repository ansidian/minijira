import express from "express";
import db from "../db/connection.js";
import sseManager from "../sse-manager.js";
import { logActivity } from "../utils/activity-logger.js";
import { issueSelectWithCounts, subtaskSelect } from "../utils/queries.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { status, assignee_id, priority, include_subtasks, parent_id } =
      req.query;

    let sql = `
      ${issueSelectWithCounts}
      WHERE 1=1
    `;
    const args = [];

    if (parent_id) {
      sql += " AND issues.parent_id = ?";
      args.push(parent_id);
    } else if (include_subtasks !== "true") {
      sql += " AND issues.parent_id IS NULL";
    }

    if (status) {
      sql += " AND issues.status = ?";
      args.push(status);
    }
    if (assignee_id) {
      sql += " AND issues.assignee_id = ?";
      args.push(assignee_id);
    }
    if (priority) {
      sql += " AND issues.priority = ?";
      args.push(priority);
    }

    sql += " ORDER BY issues.created_at DESC";

    const { rows } = await db.execute({ sql, args });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/subtasks", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        ${subtaskSelect}
        WHERE issues.parent_id = ?
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
    const { rows } = await db.execute({
      sql: `
        ${issueSelectWithCounts}
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
    });

    res.status(201).json(rows[0]);
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
    });

    res.json(rows[0]);
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
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
