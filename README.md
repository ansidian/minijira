# MiniJira

A minimal, no-nonsense project management tool for small teams. Built with the KISS principle in mind.

![MiniJira](https://img.shields.io/badge/version-2.1.2-blue)

## Features

- **Kanban Board**: Drag-and-drop between To Do, In Progress, and Done
- **Issues**: Create, edit, delete, assign, prioritize
- **Comments**: Discuss issues with your team
- **User Selection**: Pick who you are from the dropdown (persists in browser)
- **12 Team Members**: Pre-seeded for your capstone project
- **Zero Config Auth**: Trust your small team

## Tech Stack

| Layer    | Technology     |
| -------- | -------------- |
| Frontend | React + Vite   |
| Backend  | Express.js     |
| Database | Turso (libSQL) |
| Hosting  | Render         |

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm run setup

# 2. Initialize the database (uses local SQLite file)
npm run db:init

# 3. Start development servers
npm run dev
```

The app will be available at:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

## Deploy to Production

### Step 1: Create Turso Database

1. Go to [turso.tech](https://turso.tech) and sign up (free)
2. Install the CLI: `brew install tursodatabase/tap/turso` (or see their docs)
3. Login: `turso auth login`
4. Create database: `turso db create minijira`
5. Get your credentials:
   ```bash
   turso db show minijira --url      # Copy this URL
   turso db tokens create minijira   # Copy this token
   ```

### Step 2: Deploy to Render

1. Fork or clone this repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will detect the `render.yaml` config
5. **Add environment variables** (in Render dashboard):
   - `TURSO_DATABASE_URL` → paste your Turso URL (starts with `libsql://`)
   - `TURSO_AUTH_TOKEN` → paste your Turso token
6. Click **Create Web Service**

### Step 3: Initialize Production Database

After first deploy, run the init script against Turso:

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io" \
TURSO_AUTH_TOKEN="your-token" \
npm run db:init
```

Or use Turso's web shell in their dashboard.

### Custom Domain

To use `minijira.yourdomain.com`:

1. In Render dashboard → Settings → Custom Domains
2. Add `minijira.yourdomain.com`
3. Add a CNAME record in your DNS:
   - Name: `minijira`
   - Value: `your-service-name.onrender.com`

## API Endpoints

### Users

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get single user

### Issues

- `GET /api/issues` - List issues (supports `?status=`, `?assignee_id=`, `?priority=`)
- `GET /api/issues/:id` - Get single issue
- `POST /api/issues` - Create issue
- `PATCH /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue

### Comments

- `GET /api/issues/:id/comments` - Get comments for issue
- `POST /api/issues/:id/comments` - Add comment

### Stats

- `GET /api/stats` - Get issue counts by status

## Project Structure

```
minijira/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main application
│   │   ├── index.css      # Styles
│   │   └── main.jsx       # Entry point
│   └── index.html
├── server/
│   ├── db/
│   │   ├── connection.js  # Turso/SQLite connection
│   │   └── init.js        # Schema + seed data
│   └── index.js           # Express API
├── render.yaml            # Render deployment config
└── package.json
```

## Customization

### Change Project Key Prefix

Edit `server/index.js` and `server/db/init.js`, change `JPL-` to your preferred prefix.

### Add/Remove Team Members

Edit the `seedUsers` array in `server/db/init.js` and re-run `npm run db:init`.

### Add More Statuses

1. Update the `CHECK` constraint in `server/db/init.js`
2. Add the column config in `client/src/App.jsx` (COLUMNS array)
3. Add CSS for the new status color

## What's NOT Included (by design)

- ❌ Authentication/Authorization
- ❌ Sprints/Velocity tracking
- ❌ Time tracking
- ❌ Complex workflows
- ❌ Epics, Components, Versions
- ❌ Notifications
- ❌ Integrations

## License

MIT - Do whatever you want with it.

---

Purpose-built for a team of 12 in mind for a Senior Design Capstone Project.
