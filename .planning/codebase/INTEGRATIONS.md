# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**None detected:**
- No external API integrations (Stripe, AWS, third-party services, etc.)
- Self-contained application with all logic in-process

## Data Storage

**Databases:**
- SQLite (local) / Turso (cloud)
  - Connection: `@libsql/client` package
  - Config in: `server/db/connection.js`
  - Local file: `file:server/db/minijira.db`
  - Cloud connection: `TURSO_DATABASE_URL` env var
  - Cloud auth: `TURSO_AUTH_TOKEN` env var
  - Schema initialization: `server/db/init.js`
  - Tables: users, issues, comments, activity_log

**File Storage:**
- Local filesystem only (avatar colors stored as text in database)
- No external file storage service

**Caching:**
- None - No Redis, Memcached, or caching layer
- Frontend uses in-memory React state for subtasks caching (`subtasksCache` object)

## Authentication & Identity

**Auth Provider:**
- None - No authentication system
  - User selection stored in browser `localStorage` (key: `mantine-color-scheme` for theme, user ID not visible in reviewed code)
  - No password verification
  - No session management
  - Client-side only user selection

## Monitoring & Observability

**Error Tracking:**
- None - No Sentry, Rollbar, or error tracking service

**Logs:**
- Console-based logging only
  - Server: `console.log` statements in `server/index.js` and `server/sse-manager.js`
  - SSE connection logging: Client connect/disconnect events
  - No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Render.com (configured in `render.yaml`)
  - Service type: web
  - Runtime: Node.js
  - Build command: `npm install && npm run build && npm run db:init`
  - Start command: `npm start`

**CI Pipeline:**
- None - No GitHub Actions, CircleCI, or automated CI
- Manual deployment via Render platform

## Environment Configuration

**Required env vars:**
- None for local development (defaults to local SQLite)

**Optional env vars (production):**
- `NODE_ENV=production` - Enables serving static client build
- `PORT` - HTTP server port (defaults to 3001)
- `TURSO_DATABASE_URL` - Turso cloud database URL
- `TURSO_AUTH_TOKEN` - Turso authentication token

**Secrets location:**
- Environment variables (not committed to repository)
- `.env` files not detected in codebase (excluded via `.gitignore` pattern)

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints detected

**Outgoing:**
- None - No outbound webhooks or callback URLs

## Real-Time Communication

**Server-Sent Events (SSE):**
- Custom implementation in `server/sse-manager.js`
  - Endpoint: `GET /api/events`
  - Purpose: Broadcast activity updates to all connected clients
  - Heartbeat: 30-second interval to keep connections alive
  - Manager: Singleton SSE manager tracking connected clients
  - Usage: Activity log updates trigger broadcasts via `sseManager.broadcast()`

---

*Integration audit: 2026-01-20*
