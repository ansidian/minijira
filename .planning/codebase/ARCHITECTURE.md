# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Monolithic Full-Stack SPA

**Key Characteristics:**
- Single-page React frontend with all components in one file
- RESTful Express backend with inline routes
- SQLite/libSQL database with direct SQL queries
- Server-Sent Events (SSE) for real-time updates
- No traditional layering - flat, procedural architecture

## Layers

**Frontend (Client):**
- Purpose: React SPA providing the entire user interface
- Location: `client/src/`
- Contains: Single-file React app, styles, entry point
- Depends on: Backend REST API at `/api`, Mantine UI library
- Used by: End users via browser

**Backend (Server):**
- Purpose: Express REST API handling all business logic and data access
- Location: `server/`
- Contains: HTTP server, route handlers, database queries, SSE management
- Depends on: Database connection, libSQL client
- Used by: Frontend client via HTTP/SSE

**Database:**
- Purpose: SQLite/libSQL data persistence
- Location: `server/db/`
- Contains: Connection module, initialization script, schema definitions
- Depends on: `@libsql/client` library
- Used by: Server layer via direct SQL queries

## Data Flow

**Issue Status Update (Drag & Drop):**

1. User drags issue card to new column (frontend)
2. Frontend optimistically updates local state
3. Frontend sends PATCH `/api/issues/:id` with new status
4. Backend validates and updates database
5. Backend logs activity to `activity_log` table
6. Backend broadcasts SSE event to all connected clients
7. Other clients receive SSE event and refresh their state
8. Backend returns updated issue with joined data
9. Frontend confirms optimistic update or reverts on error

**State Management:**
- Frontend uses React `useState` hooks for all state
- No global state management library (Redux, Zustand, etc.)
- State is lifted to root `App` component and passed down via props
- SSE connection maintains real-time sync across clients

## Key Abstractions

**Issue Entity:**
- Purpose: Core domain model representing tasks and subtasks
- Examples: `server/index.js` lines 94-464, `client/src/App.jsx` issue state
- Pattern: Self-referential with `parent_id` for hierarchy (max depth 1)

**API Helper Object:**
- Purpose: Centralized HTTP client wrapper
- Examples: `client/src/App.jsx` lines 39-67
- Pattern: Object with async methods (get, post, patch, delete)

**SSE Manager (Singleton):**
- Purpose: Manages server-sent event connections for real-time updates
- Examples: `server/sse-manager.js`
- Pattern: Singleton class maintaining Set of connected clients

**Activity Logger:**
- Purpose: Records all user actions for audit trail
- Examples: `server/index.js` lines 28-42 (`logActivity` function)
- Pattern: Procedural helper function with automatic cleanup (20-entry limit)

## Entry Points

**Client Entry:**
- Location: `client/src/main.jsx`
- Triggers: Browser loads `index.html`
- Responsibilities: React bootstrapping, Mantine theme setup, color scheme initialization

**Server Entry:**
- Location: `server/index.js`
- Triggers: `npm run server` or `npm start`
- Responsibilities: Express app initialization, route registration, SSE endpoint, static file serving (production)

**Database Initialization:**
- Location: `server/db/init.js`
- Triggers: `npm run db:init`
- Responsibilities: Table creation, migrations, user seeding, sample data

## Error Handling

**Strategy:** Inline try-catch with HTTP status codes

**Patterns:**
- Backend: Each route wraps database operations in try-catch, returns 500 with `{ error: err.message }`
- Frontend: Async/await with implicit error handling, toast notifications for user feedback
- No centralized error handler middleware
- No error boundaries in React

## Cross-Cutting Concerns

**Logging:** Console.log statements for SSE events and database initialization; no structured logging framework

**Validation:** Inline validation in route handlers (e.g., "Title is required"); no schema validation library

**Authentication:** None - user selection is client-side only via localStorage; no sessions, tokens, or access control

---

*Architecture analysis: 2026-01-20*
