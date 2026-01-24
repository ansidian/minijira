# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Full-stack monolithic application with a React SPA frontend and Express REST API backend. Client-side state management via React Context + useReducer. Real-time updates via Server-Sent Events (SSE).

**Key Characteristics:**
- Monolithic single-file frontend at `client/src/App.jsx` with component definitions
- Modular backend with route-based organization
- Client-driven caching for subtask data with SSE-based real-time sync
- Context-based state management with no external state library (Redux/Zustand)
- Self-referential database schema for parent-child (issue-subtask) relationships
- Optimistic UI updates with error recovery via activity polling

## Layers

**Frontend (React SPA):**
- Purpose: User interface, client-side state management, drag-and-drop board
- Location: `client/src/`
- Contains: React components, context providers, custom hooks, utilities
- Depends on: Express REST API, Mantine UI library
- Used by: Browser/web clients

**Backend API (Express):**
- Purpose: HTTP REST endpoints, database operations, SSE broadcasting, activity logging
- Location: `server/`
- Contains: Route handlers, database connection, middleware
- Depends on: SQLite/Turso database, libSQL client
- Used by: React SPA frontend

**Database (SQLite/Turso):**
- Purpose: Persistent data storage for issues, users, comments, activity logs
- Location: `server/db/minijira.db` (local) or Turso cloud
- Contains: Tables for users, issues, comments, activity_log, counters
- Depends on: Nothing
- Used by: Express API

**Context Layer (Frontend State):**
- Purpose: Centralized state management for issues, users, activity, board view
- Location: `client/src/contexts/`
- Contains: IssuesContext, UsersContext, ActivityContext, BoardContext, UIContext
- Depends on: Hooks, API utility, custom hooks
- Used by: All components throughout app

**Utilities:**
- API client: `client/src/utils/api.js` - fetch wrapper for REST calls
- Activity logger: `server/utils/activity-logger.js` - logs user actions
- Query builder: `server/utils/queries.js` - reusable SQL column/join definitions
- Hooks: `client/src/hooks/` - custom React hooks for subtask cache, deletion, polling

## Data Flow

**Initial Load:**

1. `App.jsx` initializes providers in order: UsersProvider → UIProvider → AppShell
2. UsersContext fetches `/api/users` and loads current user from localStorage
3. IssuesProvider calls `loadData()` which fetches `/api/issues` (parent issues only)
4. BoardProvider memoizes issues into `issuesByStatus` organized by Kanban column
5. ActivityContext establishes SSE connection to `/api/events` for real-time updates
6. BoardContainer renders Kanban board with issues grouped by status

**Issue Status Change:**

1. User drags issue card to new column in `Board.jsx`
2. IssueCard/Column calls `onStatusChange()` from BoardContext
3. BoardProvider executes `handleStatusChange()` from IssuesContext
4. Status update sent to `PATCH /api/issues/:id` immediately (optimistic)
5. Local state updated; if error, `handleStatusChange` reverts state
6. Server logs activity via `logActivity()` and broadcasts SSE event
7. Other clients receive SSE event, trigger `loadData()` refresh

**Subtask Expansion:**

1. User clicks expand arrow on parent issue card in IssueCard.jsx
2. Calls `onToggleSubtasks()` which toggles expanded state in IssuesContext
3. If expanding and not cached, calls `fetchSubtasksForParent()` hook
4. Hook fetches `GET /api/issues/:parentId/subtasks` and caches in state
5. SubtaskCardInline components render cached subtasks inline on card
6. Expanding/collapsing toggles visibility without refetching

**Comment Creation:**

1. User submits comment in IssueDetailModal
2. Component calls `POST /api/issues/:id/comments` with body and user_id
3. Server stores comment, logs activity, broadcasts SSE event
4. Client SSE listener triggers `loadData()` to refresh issue detail
5. IssueComments section re-renders with new comment in list

**State Management:**

- Issues: Managed by IssuesContext reducer with actions for SET_ISSUES, UPDATE_ISSUE, ADD_ISSUE, etc.
- Users: Managed by UsersContext reducer; currentUserId persisted to localStorage
- Activity: Managed by ActivityContext reducer with showActivityLog and hasNewActivity
- Board View: Memoized in BoardContext from issues list, computed by status
- Subtasks: Cached in IssuesContext.subtasksCache object keyed by parent issue ID
- UI State: Managed by UIContext for modals, selected issue, create status, animations

## Key Abstractions

**Context Providers (Frontend State):**
- Purpose: Centralize shared state and provide dispatch functions to components
- Examples: `IssuesContext.jsx`, `UsersContext.jsx`, `ActivityContext.jsx`, `BoardContext.jsx`, `UIContext.jsx`
- Pattern: useReducer + Context API with custom hooks (useIssues, useUsers, etc.) for consumption

**Route Handlers (Backend Endpoints):**
- Purpose: Handle HTTP requests, execute queries, return JSON responses
- Examples: `server/routes/issues-routes.js`, `server/routes/comments-routes.js`, `server/routes/users-routes.js`
- Pattern: Express Router with async/await error handling, queries built from utility functions

**Custom Hooks (Frontend Logic):**
- Purpose: Encapsulate reusable component logic and side effects
- Examples: `useSubtaskCache.js` (cache subtask fetching), `useActivityPolling.js` (SSE listener), `useIssueDelete.js` (deletion with undo)
- Pattern: useEffect/useCallback with refs to manage async operations and state updates

**Query Builders (Backend SQL):**
- Purpose: Reusable SQL fragments with proper joins and aliases
- Examples: `issueSelectWithCounts`, `subtaskSelect` in `server/utils/queries.js`
- Pattern: Template strings with SELECT/FROM/JOIN definitions, injected into route handlers

**SSE Manager (Real-time Broadcast):**
- Purpose: Manages WebSocket-like connections and broadcasts events to all clients
- Location: `server/sse-manager.js`
- Pattern: Singleton instance with addClient/removeClient/broadcast methods, heartbeat keepalive

## Entry Points

**Frontend:**
- Location: `client/src/main.jsx`
- Triggers: Browser load of `index.html`
- Responsibilities: Initialize React, wrap App with MantineProvider and Toaster, render to DOM

**Backend:**
- Location: `server/index.js`
- Triggers: `npm start` or `npm run server`
- Responsibilities: Initialize Express app, register route handlers, serve static files in production, listen on PORT 3001

**Database:**
- Location: `server/db/init.js`
- Triggers: `npm run db:init`
- Responsibilities: Create tables (users, issues, comments, activity_log, counters), run migrations, seed initial data

## Error Handling

**Strategy:** Try-catch blocks with HTTP status codes; client-side retry logic and notifications.

**Patterns:**

- **Server routes:** `try { ... } catch (err) { res.status(500).json({ error: err.message }) }`
- **Client API calls:** `api.get/post/patch/delete()` returns JSON; no error checking in base client (errors thrown)
- **Client-side recovery:** Most mutations use optimistic updates; if server fails, state reverts or undo notification offered
- **Activity polling:** SSE listener catches connection errors and falls back to periodic polling
- **Validation:** Server-side checks for required fields (title, parent existence) before INSERT/UPDATE; returns 400 Bad Request
- **Not found:** Returns 404 when issue/user/comment doesn't exist with `{ error: "X not found" }`

## Cross-Cutting Concerns

**Logging:**
- Activity log stored in `activity_log` table for every issue/subtask/comment mutation
- Captures action_type, user_id, old_value, new_value, issue details
- Exposed via `GET /api/activity` paginated endpoint
- Frontend displays in ActivityLogModal with user names and colors joined from users table

**Validation:**
- Server: Type checks (required fields, enum values) in route handlers before DB insert
- Database: CHECK constraints on issues.status and issues.priority columns
- Frontend: Form validation in CreateIssueModal and IssueDetailModal before submission
- Subtask parent validation: Must verify parent issue exists before creating subtask

**Authentication:**
- Not implemented; user selection is client-side only via dropdown in Header
- currentUserId stored in localStorage; can be changed by user at any time
- No permission checks; any user can view/edit any issue
- Activity log records user_id but does not validate or authorize

**Real-time Synchronization:**
- SSE connection at `/api/events` keeps browser connected to server
- Server broadcasts events on issue_created, status_changed, comment_added, etc.
- Client SSE listener updates local cache or triggers full data refresh
- Heartbeat every 30 seconds prevents connection timeout
- Fallback polling if SSE unavailable (useActivityPolling hook)

**Drag-and-Drop:**
- Implemented with native HTML5 drag events (no external DnD library)
- Touch devices detected via `isTouchDevice()` util; context menus disabled on touch
- Desktop: Right-click context menus on issue cards for delete/edit actions
- Board reorganizes issues by status using IssueCard.onDrop callback

---

*Architecture analysis: 2026-01-23*
