import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
}

// ============================================
// USERS
// ============================================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM users ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [req.params.id],
    });
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ISSUES
// ============================================

// Get all issues (with assignee info)
app.get('/api/issues', async (req, res) => {
  try {
    const { status, assignee_id, priority } = req.query;

    let sql = `
      SELECT 
        issues.*,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color,
        reporter.name as reporter_name
      FROM issues
      LEFT JOIN users assignee ON issues.assignee_id = assignee.id
      LEFT JOIN users reporter ON issues.reporter_id = reporter.id
      WHERE 1=1
    `;
    const args = [];

    if (status) {
      sql += ' AND issues.status = ?';
      args.push(status);
    }
    if (assignee_id) {
      sql += ' AND issues.assignee_id = ?';
      args.push(assignee_id);
    }
    if (priority) {
      sql += ' AND issues.priority = ?';
      args.push(priority);
    }

    sql += ' ORDER BY issues.created_at DESC';

    const { rows } = await db.execute({ sql, args });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single issue
app.get('/api/issues/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        SELECT 
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          reporter.name as reporter_name
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN users reporter ON issues.reporter_id = reporter.id
        WHERE issues.id = ?
      `,
      args: [req.params.id],
    });
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create issue
app.post('/api/issues', async (req, res) => {
  try {
    const { title, description, priority, assignee_id, reporter_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get next issue key
    await db.execute("UPDATE counters SET value = value + 1 WHERE name = 'issue_key'");
    const { rows: counterRows } = await db.execute("SELECT value FROM counters WHERE name = 'issue_key'");
    const key = `MJ-${counterRows[0].value}`;

    const result = await db.execute({
      sql: `INSERT INTO issues (key, title, description, priority, assignee_id, reporter_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [key, title, description || null, priority || 'medium', assignee_id || null, reporter_id || null],
    });

    const { rows } = await db.execute({
      sql: 'SELECT * FROM issues WHERE id = ?',
      args: [result.lastInsertRowid],
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update issue
app.patch('/api/issues/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assignee_id } = req.body;
    const { id } = req.params;

    const { rows: existing } = await db.execute({
      sql: 'SELECT * FROM issues WHERE id = ?',
      args: [id],
    });
    if (existing.length === 0) return res.status(404).json({ error: 'Issue not found' });

    const updates = [];
    const args = [];

    if (title !== undefined) {
      updates.push('title = ?');
      args.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      args.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      args.push(priority);
    }
    if (assignee_id !== undefined) {
      updates.push('assignee_id = ?');
      args.push(assignee_id || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(id);
      await db.execute({
        sql: `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });
    }

    const { rows } = await db.execute({
      sql: `
        SELECT 
          issues.*,
          assignee.name as assignee_name,
          assignee.avatar_color as assignee_color,
          reporter.name as reporter_name
        FROM issues
        LEFT JOIN users assignee ON issues.assignee_id = assignee.id
        LEFT JOIN users reporter ON issues.reporter_id = reporter.id
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
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM issues WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Issue not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// COMMENTS
// ============================================

// Get comments for an issue
app.get('/api/issues/:id/comments', async (req, res) => {
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
app.post('/api/issues/:id/comments', async (req, res) => {
  try {
    const { body, user_id } = req.body;
    const issue_id = req.params.id;

    if (!body) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const { rows: issueRows } = await db.execute({
      sql: 'SELECT id FROM issues WHERE id = ?',
      args: [issue_id],
    });
    if (issueRows.length === 0) return res.status(404).json({ error: 'Issue not found' });

    const result = await db.execute({
      sql: 'INSERT INTO comments (issue_id, user_id, body) VALUES (?, ?, ?)',
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

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STATS (for dashboard)
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const [total, todo, inProgress, done] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM issues'),
      db.execute("SELECT COUNT(*) as count FROM issues WHERE status = 'todo'"),
      db.execute("SELECT COUNT(*) as count FROM issues WHERE status = 'in_progress'"),
      db.execute("SELECT COUNT(*) as count FROM issues WHERE status = 'done'"),
    ]);

    res.json({
      total: total.rows[0].count,
      todo: todo.rows[0].count,
      in_progress: inProgress.rows[0].count,
      done: done.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`✓ MiniJira API running at http://localhost:${PORT}`);
});
