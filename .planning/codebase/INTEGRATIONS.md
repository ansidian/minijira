# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**Internal REST API:**
- Client-to-server communication uses fetch-based REST API
- Base URL: `/api`
- Client implementation: `client/src/utils/api.js`
- HTTP methods: GET, POST, PATCH, DELETE
- Content-Type: application/json

**Real-time Events (Server-Sent Events):**
- Endpoint: `GET /api/events`
- Implementation: `server/sse-manager.js` and `server/routes/events-routes.js`
- Protocol: HTTP Server-Sent Events (text/event-stream)
- Used for: Broadcasting state changes to connected clients (issues, comments, activity)
- Heartbeat: 30-second keep-alive mechanism

## Data Storage

**Database:**
- Type: SQLite (local development) or Turso/libSQL (production)
- Client: `@libsql/client` 0.6.0
- Connection: `server/db/connection.js`
- Development: Local file at `file:server/db/minijira.db`
- Production: Turso cloud (via `TURSO_DATABASE_URL` env var)

**Tables:**
- `users` - User accounts with email, name, avatar color
- `issues` - Issues/tasks with parent_id for subtask hierarchy
- `comments` - Comments on issues
- `activity_log` - Audit trail of changes
- `counters` - Auto-increment tracking for issue keys (e.g., JPL-1)

**File Storage:**
- Not used; images and attachments not supported

**Caching:**
- Frontend: In-memory subtasks cache in React context
- Server: No external cache (all state in database)

## Authentication & Identity

**Auth Provider:**
- None; no authentication system

**User Management:**
- Client-side user selection via `localStorage`
- Any user can impersonate any other user (no access control)
- Users stored in `users` table with email, name, and avatar color
- No password or OAuth integration

**Session/Storage:**
- localStorage: Stores current user ID, theme preference (color scheme), activity view timestamp
- SessionStorage: Not used
- Keys: `minijira_current_user`, `mantine-color-scheme`, `minijira_activity_viewed`

## Monitoring & Observability

**Error Tracking:**
- Not integrated; errors logged to console only

**Logs:**
- Console.log for server startup and errors
- Activity log stored in database (`activity_log` table) for audit trail
- Client errors printed to browser console

**Observability:**
- No third-party monitoring (no Sentry, DataDog, etc.)

## CI/CD & Deployment

**Hosting:**
- Self-hosted (any Node.js environment)
- Not integrated with specific cloud platform

**CI Pipeline:**
- Not detected; no CI/CD configuration found

**Build Process:**
- `npm run build` - Builds frontend with Vite, outputs to `client/dist`
- `npm start` - Runs production server serving built static assets

## Environment Configuration

**Required env vars:**
- `PORT` (optional; defaults to 3001) - Express server port
- `NODE_ENV` (optional; defaults to development) - Set to "production" for production mode
- `TURSO_DATABASE_URL` (optional) - Turso database URL; if not set, uses local SQLite
- `TURSO_AUTH_TOKEN` (optional) - Turso authentication token

**Database Connection Logic:**
- If `TURSO_DATABASE_URL` is set, connect to Turso cloud
- Otherwise, use local SQLite at `file:server/db/minijira.db`

**Secrets location:**
- Environment variables (e.g., `.env` file or deployment secrets)
- No hardcoded secrets in codebase

## Webhooks & Callbacks

**Incoming:**
- Not used; no webhook endpoints

**Outgoing:**
- Not used; no external service callbacks

## API Endpoints Summary

**Server Routes:**
- `server/routes/users-routes.js` - User CRUD operations
- `server/routes/issues-routes.js` - Issue CRUD, status/priority/assignee updates
- `server/routes/comments-routes.js` - Comment CRUD on issues
- `server/routes/activity-routes.js` - Activity log queries
- `server/routes/stats-routes.js` - Statistics and dashboards
- `server/routes/events-routes.js` - SSE streaming endpoint

**Data Flow:**
1. Frontend makes fetch request to `/api/[resource]`
2. Express routes to appropriate handler
3. Handler queries SQLite/Turso database
4. SSE broadcasts changes to all connected clients
5. Frontend updates local state and re-renders

---

*Integration audit: 2026-01-23*
