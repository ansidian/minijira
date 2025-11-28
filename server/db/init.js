import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, "minijira.db"));

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Issues table
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Comments table
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Counter for issue keys
  CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
  );

  -- Initialize counter
  INSERT OR IGNORE INTO counters (name, value) VALUES ('issue_key', 0);
`);

//Norma Argueta, Garen Artsrounian, Tailsy Bobadilla, Diego De La Fuente, Edward Garcia-Cuevas, Yamilena Hernandez, Rodrigo Martell, Anthony Sanchez-Espindola, Andy Su, Kevin Truong, Andrew Wun, Erick Nava

// Seed some initial users for your team
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
	{ name: "Norma Argueta", email: "jamie@team.edu", avatar_color: "#a855f7" },
	{
		name: "Tailsy Bobadilla",
		email: "skyler@team.edu",
		avatar_color: "#0ea5e9",
	},
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, avatar_color) VALUES (?, ?, ?)
`);

for (const user of seedUsers) {
	insertUser.run(user.name, user.email, user.avatar_color);
}

// Seed some example issues
const getNextKey = db.prepare(`
  UPDATE counters SET value = value + 1 WHERE name = 'issue_key' RETURNING value
`);

const insertIssue = db.prepare(`
  INSERT INTO issues (key, title, description, status, priority, assignee_id, reporter_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

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
	const { value: keyNum } = getNextKey.get();
	const key = `MJ-${keyNum}`;
	insertIssue.run(
		key,
		issue.title,
		issue.description,
		issue.status,
		issue.priority,
		issue.assignee_id,
		issue.reporter_id
	);
}

console.log("✓ Database initialized with schema and seed data");
console.log(`  - ${seedUsers.length} users created`);
console.log(`  - ${sampleIssues.length} sample issues created`);

db.close();
