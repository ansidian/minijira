import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:server/db/minijira.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      parent_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
      issue_key TEXT,
      issue_title TEXT,
      action_type TEXT NOT NULL CHECK(action_type IN (
        'issue_created',
        'status_changed',
        'assignee_changed',
        'priority_changed',
        'comment_added',
        'subtask_created',
        'issue_deleted',
        'subtask_deleted'
      )),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('issue', 'comment', 'subtask')),
      old_value TEXT,
      new_value TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_created_at
      ON activity_log(created_at DESC)
  `);

  // Migration: Add issue_key and issue_title columns if they don't exist
  try {
    await db.execute(`ALTER TABLE activity_log ADD COLUMN issue_key TEXT`);
  } catch (err) {
    // Column already exists, ignore
  }
  try {
    await db.execute(`ALTER TABLE activity_log ADD COLUMN issue_title TEXT`);
  } catch (err) {
    // Column already exists, ignore
  }

  // Migration: Add previous_status column to issues table if it doesn't exist
  try {
    await db.execute(`ALTER TABLE issues ADD COLUMN previous_status TEXT`);
  } catch (err) {
    // Column already exists, ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO counters (name, value) VALUES ('issue_key', 0)
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_payload TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'sent', 'failed')),
      attempt_count INTEGER DEFAULT 0,
      processing_started_at TEXT,
      sent_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_debounce
      ON notification_queue(issue_id, user_id, status)
      WHERE status = 'pending'
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_queue_pending
      ON notification_queue(status, scheduled_at)
      WHERE status = 'pending'
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_queue_cleanup
      ON notification_queue(status, sent_at)
      WHERE status IN ('sent', 'failed')
  `);

  // Migration: Add first_queued_at column for max-wait debounce logic
  try {
    await db.execute(`ALTER TABLE notification_queue ADD COLUMN first_queued_at TEXT`);
  } catch (err) {
    // Column already exists, ignore
  }

  const seedUsers = [
    { name: "Andy Su", email: "alex@team.edu", avatar_color: "#ef4444" },
    {
      name: "Garen Artsrounian",
      email: "jordan@team.edu",
      avatar_color: "#f97316",
    },
    {
      name: "Diego De La Fuente",
      email: "sam@team.edu",
      avatar_color: "#eab308",
    },
    {
      name: "Edward Garcia-Cuevas",
      email: "riley@team.edu",
      avatar_color: "#22c55e",
    },
    {
      name: "Yamilena Hernandez",
      email: "casey@team.edu",
      avatar_color: "#06b6d4",
    },
    {
      name: "Rodrigo Martell",
      email: "morgan@team.edu",
      avatar_color: "#3b82f6",
    },
    {
      name: "Anthony Sanchez-Espindola",
      email: "taylor@team.edu",
      avatar_color: "#8b5cf6",
    },
    {
      name: "Kevin Truong",
      email: "avery@team.edu",
      avatar_color: "#ec4899",
    },
    {
      name: "Andrew Wun",
      email: "quinn@team.edu",
      avatar_color: "#14b8a6",
    },
    { name: "Erick Nava", email: "drew@team.edu", avatar_color: "#f43f5e" },
    {
      name: "Norma Argueta",
      email: "jamie@team.edu",
      avatar_color: "#a855f7",
    },
    {
      name: "Tailsy Bobadilla",
      email: "skyler@team.edu",
      avatar_color: "#0ea5e9",
    },
  ];

  for (const user of seedUsers) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO users (name, email, avatar_color) VALUES (?, ?, ?)",
      args: [user.name, user.email, user.avatar_color],
    });
  }

  // seed initial issues if not exists (new db)
  const { rows } = await db.execute("SELECT COUNT(*) as count FROM issues");
  if (rows[0].count === 0) {
    const sampleIssues = [
      {
        title: "Set up project repository",
        description:
          "Initialize Git repo, set up branch protection, add team members",
        status: "done",
        priority: "high",
        assignee_id: 1,
        reporter_id: 1,
      },
      {
        title: "Design system architecture",
        description:
          "Create high-level architecture diagram and document key decisions",
        status: "in_progress",
        priority: "high",
        assignee_id: 2,
        reporter_id: 1,
      },
      {
        title: "Implement user authentication",
        description: "Basic login/logout functionality for team members",
        status: "todo",
        priority: "medium",
        assignee_id: 3,
        reporter_id: 2,
      },
      {
        title: "Write project documentation",
        description: "README, setup instructions, contributing guidelines",
        status: "todo",
        priority: "low",
        assignee_id: null,
        reporter_id: 1,
      },
    ];

    for (const issue of sampleIssues) {
      // Get next key
      await db.execute(
        "UPDATE counters SET value = value + 1 WHERE name = 'issue_key'"
      );
      const { rows: counterRows } = await db.execute(
        "SELECT value FROM counters WHERE name = 'issue_key'"
      );
      const key = `MJ-${counterRows[0].value}`;

      await db.execute({
        sql: `INSERT INTO issues (key, title, description, status, priority, assignee_id, reporter_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          key,
          issue.title,
          issue.description,
          issue.status,
          issue.priority,
          issue.assignee_id,
          issue.reporter_id,
        ],
      });
    }

    console.log(`  - ${sampleIssues.length} sample issues created`);
  }

  console.log("Database initialized");
  console.log(`  - ${seedUsers.length} users ensured`);
}

init().catch(console.error);
