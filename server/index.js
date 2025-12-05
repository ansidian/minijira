import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import db from "./db/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../client/dist")));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function logActivity(issueId, actionType, entityType, userId, oldValue = null, newValue = null, issueKey = null, issueTitle = null) {
  await db.execute({
    sql: `INSERT INTO activity_log (issue_id, action_type, entity_type, user_id, old_value, new_value, issue_key, issue_title)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [issueId, actionType, entityType, userId, oldValue, newValue, issueKey, issueTitle]
  });
}

// ============================================
// USERS
// ============================================

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const { rows } = await db.execute("SELECT * FROM users ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user
app.get("/api/users/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [req.params.id],
    });
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ISSUES
// ============================================

// Get all issues (with assignee info and subtask counts)
app.get("/api/issues", async (req, res) => {
  try {
    const { status, assignee_id, priority, include_subtasks, parent_id } =
      req.query;

    let sql = `
      SELECT 
        issues.*,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color,
        reporter.name as reporter_name,
        parent.key as parent_key,
        (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id) as subtask_count,
        (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id AND sub.status = 'done') as subtask_done_count
      FROM issues
      LEFT JOIN users assignee ON issues.assignee_id = assignee.id
      LEFT JOIN users reporter ON issues.reporter_id = reporter.id
      LEFT JOIN issues parent ON issues.parent_id = parent.id
      WHERE 1=1
    `;
    const args = [];

    // Filter for subtasks of a specific parent
    if (parent_id) {
      sql += " AND issues.parent_id = ?";
      args.push(parent_id);
    } else if (include_subtasks !== "true") {
      // By default, exclude subtasks from main board view
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

// Get subtasks for a specific issue
app.get("/api/issues/:id/subtasks", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        SELECT
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          parent.key as parent_key
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN issues parent ON issues.parent_id = parent.id
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

// Get single issue
app.get("/api/issues/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        SELECT 
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          reporter.name as reporter_name,
          parent.key as parent_key,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id) as subtask_count,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id AND sub.status = 'done') as subtask_done_count
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN users reporter ON issues.reporter_id = reporter.id
        LEFT JOIN issues parent ON issues.parent_id = parent.id
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

// Create issue
app.post("/api/issues", async (req, res) => {
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

    // If creating a subtask, verify parent exists
    if (parent_id) {
      const { rows: parentRows } = await db.execute({
        sql: "SELECT id FROM issues WHERE id = ?",
        args: [parent_id],
      });
      if (parentRows.length === 0) {
        return res.status(400).json({ error: "Parent issue not found" });
      }
    }

    // Get next issue key (atomic increment + read to prevent race conditions)
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

    // Return the created issue with all joined fields
    const { rows } = await db.execute({
      sql: `
        SELECT 
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          reporter.name as reporter_name,
          parent.key as parent_key,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id) as subtask_count,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id AND sub.status = 'done') as subtask_done_count
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN users reporter ON issues.reporter_id = reporter.id
        LEFT JOIN issues parent ON issues.parent_id = parent.id
        WHERE issues.id = ?
      `,
      args: [result.lastInsertRowid],
    });

    // Log activity
    await logActivity(
      result.lastInsertRowid,
      parent_id ? 'subtask_created' : 'issue_created',
      parent_id ? 'subtask' : 'issue',
      reporter_id || null,
      null,
      null,
      key,
      title
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update issue
app.patch("/api/issues/:id", async (req, res) => {
  try {
    const { title, description, status, priority, assignee_id, parent_id, previous_status, user_id } =
      req.body;
    const { id } = req.params;

    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM issues WHERE id = ?",
      args: [id],
    });
    if (existing.length === 0)
      return res.status(404).json({ error: "Issue not found" });

    // Store old values for activity logging
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
      // When moving to 'done', store current status as previous_status
      if (status === 'done' && existing[0].status !== 'done') {
        updates.push("previous_status = ?");
        args.push(existing[0].status);
      }
      // When moving from 'done', clear previous_status
      if (status !== 'done' && existing[0].status === 'done') {
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
      // Prevent setting parent_id to self or to a descendant (would create cycle)
      if (parent_id === parseInt(id)) {
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

      // Log activity for changed fields
      if (status !== undefined && oldIssue.status !== status) {
        await logActivity(id, 'status_changed', 'issue', user_id || null, oldIssue.status, status, oldIssue.key, title !== undefined ? title : oldIssue.title);
      }
      if (priority !== undefined && oldIssue.priority !== priority) {
        await logActivity(id, 'priority_changed', 'issue', user_id || null, oldIssue.priority, priority, oldIssue.key, title !== undefined ? title : oldIssue.title);
      }
      if (assignee_id !== undefined && oldIssue.assignee_id !== assignee_id) {
        await logActivity(
          id,
          'assignee_changed',
          'issue',
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
        SELECT 
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          reporter.name as reporter_name,
          parent.key as parent_key,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id) as subtask_count,
          (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id AND sub.status = 'done') as subtask_done_count
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN users reporter ON issues.reporter_id = reporter.id
        LEFT JOIN issues parent ON issues.parent_id = parent.id
        WHERE issues.id = ?
      `,
      args: [id],
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete issue
app.delete("/api/issues/:id", async (req, res) => {
  try {
    const { user_id } = req.body;

    // Fetch issue details before deletion for activity log
    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM issues WHERE id = ?",
      args: [req.params.id],
    });
    if (existing.length === 0)
      return res.status(404).json({ error: "Issue not found" });

    const issue = existing[0];
    const isSubtask = issue.parent_id !== null;

    // Log activity before deletion
    await logActivity(
      issue.id,
      isSubtask ? 'subtask_deleted' : 'issue_deleted',
      isSubtask ? 'subtask' : 'issue',
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

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// COMMENTS
// ============================================

// Get comments for an issue
app.get("/api/issues/:id/comments", async (req, res) => {
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

// Add comment
app.post("/api/issues/:id/comments", async (req, res) => {
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

    // Log activity
    await logActivity(issue_id, 'comment_added', 'comment', user_id || null, null, null, issue.key, issue.title);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STATS (for dashboard)
// ============================================

app.get("/api/stats", async (req, res) => {
  try {
    const { include_subtasks } = req.query;

    // By default, stats only count parent issues (not subtasks)
    const parentFilter =
      include_subtasks === "true" ? "" : "WHERE parent_id IS NULL";
    const parentFilterAnd =
      include_subtasks === "true" ? "WHERE" : "WHERE parent_id IS NULL AND";

    const [total, todo, inProgress, review, done] = await Promise.all([
      db.execute(`SELECT COUNT(*) as count FROM issues ${parentFilter}`),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'todo'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'in_progress'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'review'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'done'`
      ),
    ]);

    res.json({
      total: total.rows[0].count,
      todo: todo.rows[0].count,
      in_progress: inProgress.rows[0].count,
      review: review.rows[0].count,
      done: done.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ACTIVITY LOG
// ============================================

app.get("/api/activity", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await db.execute({
      sql: `
        SELECT
          activity_log.*,
          users.name as user_name,
          users.avatar_color as user_color
        FROM activity_log
        LEFT JOIN users ON activity_log.user_id = users.id
        ORDER BY activity_log.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../client/dist/index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`✓ MiniJira API running at http://localhost:${PORT}`);
});
