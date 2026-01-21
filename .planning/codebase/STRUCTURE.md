# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
minijira/
├── .planning/          # GSD command artifacts
│   └── codebase/       # Codebase analysis documents
├── client/             # Frontend React SPA
│   ├── dist/           # Vite build output (production)
│   ├── public/         # Static assets
│   ├── src/            # Source code
│   │   ├── App.jsx     # Entire application (3432 lines)
│   │   ├── main.jsx    # React entry point
│   │   └── index.css   # Global styles
│   ├── index.html      # HTML entry point
│   ├── package.json    # Client dependencies
│   └── vite.config.js  # Vite build configuration
├── server/             # Backend Express API
│   ├── db/             # Database layer
│   │   ├── connection.js   # libSQL client configuration
│   │   ├── init.js         # Schema and seed data
│   │   └── minijira.db     # SQLite database file (local dev)
│   ├── index.js        # Express server and all routes
│   └── sse-manager.js  # Server-Sent Events manager
├── tests/              # Vitest test suite
│   ├── api.test.js             # API endpoint tests
│   ├── race-conditions.test.js # Concurrency tests
│   └── test-utils.js           # Test helpers
├── package.json        # Root dependencies and scripts
├── vitest.config.js    # Test runner configuration
├── CLAUDE.md           # Development instructions for AI assistants
└── README.md           # Project documentation
```

## Directory Purposes

**`.planning/codebase/`:**
- Purpose: GSD command-generated codebase documentation
- Contains: Markdown analysis files (STACK.md, ARCHITECTURE.md, etc.)
- Key files: This document and sibling analysis documents

**`client/src/`:**
- Purpose: React frontend source code
- Contains: Single-file application, entry point, global styles
- Key files: `App.jsx` (3432 lines - entire UI), `main.jsx` (React bootstrap), `index.css` (CSS variables and styles)

**`server/`:**
- Purpose: Express backend API
- Contains: Server entry, routes, SSE manager, database modules
- Key files: `index.js` (REST API), `sse-manager.js` (real-time updates)

**`server/db/`:**
- Purpose: Database abstraction and initialization
- Contains: libSQL connection, schema definition, seed data
- Key files: `connection.js` (DB client), `init.js` (schema + migrations), `minijira.db` (local SQLite file)

**`tests/`:**
- Purpose: Backend API test suite
- Contains: Vitest tests for endpoints and race conditions
- Key files: `api.test.js` (endpoint tests), `race-conditions.test.js` (concurrency tests), `test-utils.js` (shared test utilities)

**`client/dist/`:**
- Purpose: Production build artifacts
- Contains: Compiled JavaScript, CSS, HTML
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)

**`client/public/`:**
- Purpose: Static assets served without processing
- Contains: Favicon, manifest, images
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `client/src/main.jsx`: React application bootstrap
- `server/index.js`: Express server entry point
- `server/db/init.js`: Database initialization script

**Configuration:**
- `package.json`: Root project config and scripts
- `client/package.json`: Frontend dependencies and build scripts
- `client/vite.config.js`: Vite bundler configuration
- `vitest.config.js`: Test runner configuration
- `client/postcss.config.cjs`: PostCSS processing for Mantine

**Core Logic:**
- `client/src/App.jsx`: All React components and frontend logic
- `server/index.js`: All API routes and business logic
- `server/sse-manager.js`: Real-time event broadcasting

**Testing:**
- `tests/api.test.js`: API endpoint test suite
- `tests/race-conditions.test.js`: Concurrent operation tests
- `tests/test-utils.js`: Test database setup helpers

**Database:**
- `server/db/connection.js`: Database client configuration
- `server/db/init.js`: Schema, migrations, and seed data
- `server/db/minijira.db`: Local SQLite database file (development)

**Styles:**
- `client/src/index.css`: Global CSS variables and component styles

## Naming Conventions

**Files:**
- React components: `PascalCase.jsx` (e.g., `App.jsx`)
- Server modules: `kebab-case.js` (e.g., `sse-manager.js`)
- Config files: `kebab-case.js` or framework conventions (e.g., `vite.config.js`)
- Database: `minijira.db` (lowercase, descriptive)

**Directories:**
- All lowercase: `client`, `server`, `tests`
- Descriptive: `db` for database layer

**Database Tables:**
- Snake_case: `activity_log`, `users`, `issues`, `comments`, `counters`

**API Routes:**
- RESTful: `/api/users`, `/api/issues`, `/api/issues/:id/subtasks`
- Kebab-case for multi-word resources

## Where to Add New Code

**New React Component:**
- Primary code: Add function component inside `client/src/App.jsx` (all components live here)
- Tests: Not currently tested (frontend has no test suite)

**New API Endpoint:**
- Implementation: Add route handler in `server/index.js` (after existing routes in relevant section)
- Tests: Add test cases in `tests/api.test.js`

**New Database Table:**
- Schema: Add `CREATE TABLE` statement in `server/db/init.js` (around line 8-67)
- Migrations: Add `ALTER TABLE` in try-catch blocks for safe schema evolution (lines 74-91)

**New Feature:**
- Primary code: Add component in `client/src/App.jsx`, route in `server/index.js`
- Tests: Add backend tests in `tests/api.test.js`
- Styles: Add CSS rules in `client/src/index.css` with CSS variables

**Utilities:**
- Shared helpers (frontend): Add inside `client/src/App.jsx` in utilities section (lines 71-210)
- Shared helpers (backend): Add as standalone functions in `server/index.js` or new module in `server/`
- Test utilities: Add to `tests/test-utils.js`

## Special Directories

**`node_modules/` (root and client):**
- Purpose: Installed npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignore)

**`.git/`:**
- Purpose: Git version control metadata
- Generated: Yes (git repository)
- Committed: N/A (metadata)

**`.planning/`:**
- Purpose: GSD command working directory
- Generated: Yes (by GSD commands)
- Committed: No (.gitignore)

**`client/dist/`:**
- Purpose: Vite production build output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-01-20*
