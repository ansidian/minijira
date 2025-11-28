import express from 'express';
import cors from 'cors';
import db from './db/connection.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================
// USERS
// ============================================

// Get all users
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY name').all();
  res.json(users);
});

// Get single user
app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ============================================
// ISSUES
// ============================================

// Get all issues (with assignee info)
app.get('/api/issues', (req, res) => {
  const { status, assignee_id, priority } = req.query;
  
  let query = `
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
  const params = [];

  if (status) {
    query += ' AND issues.status = ?';
    params.push(status);
  }
  if (assignee_id) {
    query += ' AND issues.assignee_id = ?';
    params.push(assignee_id);
  }
  if (priority) {
    query += ' AND issues.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY issues.created_at DESC';

  const issues = db.prepare(query).all(...params);
  res.json(issues);
});

// Get single issue
app.get('/api/issues/:id', (req, res) => {
  const issue = db.prepare(`
    SELECT 
      issues.*,
      assignee.name as assignee_name,
      assignee.avatar_color as assignee_color,
      reporter.name as reporter_name
    FROM issues
    LEFT JOIN users assignee ON issues.assignee_id = assignee.id
    LEFT JOIN users reporter ON issues.reporter_id = reporter.id
    WHERE issues.id = ?
  `).get(req.params.id);
  
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(issue);
});

// Create issue
app.post('/api/issues', (req, res) => {
  const { title, description, priority, assignee_id, reporter_id } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Get next issue key
  const { value: keyNum } = db.prepare(`
    UPDATE counters SET value = value + 1 WHERE name = 'issue_key' RETURNING value
  `).get();
  
  const key = `MJ-${keyNum}`;

  const result = db.prepare(`
    INSERT INTO issues (key, title, description, priority, assignee_id, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(key, title, description || null, priority || 'medium', assignee_id || null, reporter_id || null);

  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(issue);
});

// Update issue
app.patch('/api/issues/:id', (req, res) => {
  const { title, description, status, priority, assignee_id } = req.body;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
  if (assignee_id !== undefined) { updates.push('assignee_id = ?'); params.push(assignee_id || null); }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.prepare(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const issue = db.prepare(`
    SELECT 
      issues.*,
      assignee.name as assignee_name,
      assignee.avatar_color as assignee_color,
      reporter.name as reporter_name
    FROM issues
    LEFT JOIN users assignee ON issues.assignee_id = assignee.id
    LEFT JOIN users reporter ON issues.reporter_id = reporter.id
    WHERE issues.id = ?
  `).get(id);
  
  res.json(issue);
});

// Delete issue
app.delete('/api/issues/:id', (req, res) => {
  const result = db.prepare('DELETE FROM issues WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Issue not found' });
  res.status(204).send();
});

// ============================================
// COMMENTS
// ============================================

// Get comments for an issue
app.get('/api/issues/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT 
      comments.*,
      users.name as user_name,
      users.avatar_color as user_color
    FROM comments
    LEFT JOIN users ON comments.user_id = users.id
    WHERE comments.issue_id = ?
    ORDER BY comments.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// Add comment
app.post('/api/issues/:id/comments', (req, res) => {
  const { body, user_id } = req.body;
  const { id: issue_id } = req.params;

  if (!body) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  const issue = db.prepare('SELECT id FROM issues WHERE id = ?').get(issue_id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const result = db.prepare(`
    INSERT INTO comments (issue_id, user_id, body) VALUES (?, ?, ?)
  `).run(issue_id, user_id || null, body);

  const comment = db.prepare(`
    SELECT 
      comments.*,
      users.name as user_name,
      users.avatar_color as user_color
    FROM comments
    LEFT JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

// ============================================
// STATS (for dashboard)
// ============================================

app.get('/api/stats', (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM issues').get().count,
    todo: db.prepare("SELECT COUNT(*) as count FROM issues WHERE status = 'todo'").get().count,
    in_progress: db.prepare("SELECT COUNT(*) as count FROM issues WHERE status = 'in_progress'").get().count,
    done: db.prepare("SELECT COUNT(*) as count FROM issues WHERE status = 'done'").get().count,
  };
  res.json(stats);
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ MiniJira API running at http://localhost:${PORT}`);
});
