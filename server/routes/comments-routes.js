import express from "express";
import db from "../db/connection.js";
import sseManager from "../sse-manager.js";
import { logActivity } from "../utils/activity-logger.js";

const router = express.Router();

router.get("/:id/comments", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        SELECT 
          comments.*,
          users.name as user_name,
          users.avatar_color as user_color
        FROM comments
        LEFT JOIN users ON comments.user_id = users.id
        WHERE comments.issue_id = ?
        ORDER BY comments.created_at ASC
      `,
      args: [req.params.id],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/comments", async (req, res) => {
  try {
    const { body, user_id } = req.body;
    const issue_id = req.params.id;

    if (!body) {
      return res.status(400).json({ error: "Comment body is required" });
    }

    const { rows: issueRows } = await db.execute({
      sql: "SELECT id, key, title FROM issues WHERE id = ?",
      args: [issue_id],
    });
    if (issueRows.length === 0)
      return res.status(404).json({ error: "Issue not found" });

    const issue = issueRows[0];

    const result = await db.execute({
      sql: "INSERT INTO comments (issue_id, user_id, body) VALUES (?, ?, ?)",
      args: [issue_id, user_id || null, body],
    });

    const { rows } = await db.execute({
      sql: `
        SELECT
          comments.*,
          users.name as user_name,
          users.avatar_color as user_color
        FROM comments
        LEFT JOIN users ON comments.user_id = users.id
        WHERE comments.id = ?
      `,
      args: [result.lastInsertRowid],
    });

    await logActivity(
      issue_id,
      "comment_added",
      "comment",
      user_id || null,
      null,
      null,
      issue.key,
      issue.title
    );

    sseManager.broadcast({
      type: "comment_added",
      issueId: parseInt(issue_id),
      userId: user_id || null,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
