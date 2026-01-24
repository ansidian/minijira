# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
minijira/
├── client/                           # React SPA frontend
│   ├── src/
│   │   ├── main.jsx                  # Entry point, MantineProvider setup
│   │   ├── App.jsx                   # Root component wrapper
│   │   ├── AppShell.jsx              # Context providers, page layout
│   │   ├── components/               # React components
│   │   │   ├── board/                # Kanban board components
│   │   │   ├── layout/               # Header, footer
│   │   │   ├── modals/               # Dialogs (create, detail, activity)
│   │   │   ├── shared/               # Reusable UI components
│   │   │   └── spotlight/            # Command palette search
│   │   ├── contexts/                 # Context providers + base definitions
│   │   │   ├── hooks/                # useIssues, useUsers, useActivity hooks
│   │   │   ├── IssuesContext.jsx     # Issue state management
│   │   │   ├── UsersContext.jsx      # User state + localStorage
│   │   │   ├── ActivityContext.jsx   # Activity log + SSE listener
│   │   │   ├── BoardContext.jsx      # Kanban board computed state
│   │   │   └── UIContext.jsx         # Modal/UI state
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useSubtaskCache.js    # Subtask fetching + caching
│   │   │   ├── useActivityPolling.js # SSE + polling for real-time
│   │   │   ├── useIssueDelete.js     # Deletion with undo
│   │   │   └── ... (other hooks)
│   │   ├── utils/                    # Utilities
│   │   │   ├── api.js                # Fetch wrapper for API calls
│   │   │   ├── colors.js             # Color utilities
│   │   │   ├── formatters.jsx        # Date/text formatters
│   │   │   ├── notify.jsx            # Sonner toast notifications
│   │   │   └── platform.js           # Touch device detection
│   │   └── styles/                   # CSS files
│   │       ├── index.css             # Global styles, CSS variables
│   │       ├── components.css        # Component styles
│   │       ├── animations.css        # Keyframes
│   │       ├── responsive.css        # Media queries
│   │       └── sonner.css            # Toast styles
│   ├── package.json                  # Client dependencies (React, Mantine, Vite)
│   ├── vite.config.js                # Vite build config
│   └── index.html                    # HTML entry point
│
├── server/                           # Express REST API backend
│   ├── index.js                      # Express app setup, route registration
│   ├── sse-manager.js                # Server-Sent Events manager (singleton)
│   ├── routes/                       # Route handlers (organized by resource)
│   │   ├── issues-routes.js          # CRUD for issues and subtasks (338 lines)
│   │   ├── comments-routes.js        # Comments endpoints (88 lines)
│   │   ├── users-routes.js           # User list/get endpoints (29 lines)
│   │   ├── activity-routes.js        # Activity log endpoints (30 lines)
│   │   ├── stats-routes.js           # Stats/counts endpoints (43 lines)
│   │   └── events-routes.js          # SSE connection setup (15 lines)
│   ├── db/                           # Database
│   │   ├── connection.js             # libSQL client (SQLite/Turso)
│   │   ├── init.js                   # Table creation, migrations, seed data
│   │   └── minijira.db               # Local SQLite file (dev only)
│   ├── utils/                        # Utilities
│   │   ├── activity-logger.js        # logActivity function for audit trail
│   │   └── queries.js                # Reusable SQL fragments (SELECT, JOIN)
│   └── package.json                  # Server dependencies (Express, libSQL, cors)
│
├── tests/                            # Test files
│   └── (vitest test files)
│
├── .planning/                        # Documentation (auto-generated)
│   └── codebase/                     # Architecture/structure analysis
│
├── package.json                      # Root scripts (dev, build, db:init)
├── package-lock.json                 # Dependency lock file
├── vitest.config.js                  # Vitest test runner config
├── render.yaml                       # Deployment config (Render.com)
├── CLAUDE.md                         # Development guidelines
└── README.md                         # Project overview
```

## Directory Purposes

**client/src/components/board/:**
- Purpose: Kanban board visualization and issue cards
- Contains: Board (columns grid), Column (single status column), IssueCard (draggable card), SubtaskCardInline (subtask preview on card)
- Key files: `Board.jsx`, `Column.jsx`, `IssueCard.jsx`, `SubtaskCardInline.jsx`, `BoardContainer.jsx` (wrapper with context)

**client/src/components/modals/:**
- Purpose: Modal dialogs for create/edit/view operations
- Contains: CreateIssueModal (new issue/subtask form), IssueDetailModal (full issue view), ActivityLogModal (audit trail), SubtasksSection (edit subtasks in detail view)
- Nested: `issue-detail/` subdirectory with detail modal sub-components (IssueDetailFields, IssueComments, IssueDeleteSection, etc.)

**client/src/components/shared/:**
- Purpose: Reusable UI components used across the app
- Contains: SubtaskRow (subtask display), UnassignedAvatar (placeholder user avatar)

**client/src/components/spotlight/:**
- Purpose: Command palette / search functionality
- Contains: SpotlightSearch component (Mantine Spotlight integration)

**client/src/components/layout/:**
- Purpose: Page layout container components
- Contains: Header (top nav, user selector, search toggle), Footer (branding)

**client/src/contexts/:**
- Purpose: React Context providers for global state
- Contains: IssuesProvider, UsersProvider, ActivityProvider, BoardProvider, UIProvider
- Base definitions: *ContextBase.js files define createContext + export context object
- Custom hooks: `hooks/` subdirectory with useIssues, useUsers, useActivity, useBoard for consuming context

**client/src/hooks/:**
- Purpose: Custom React hooks for encapsulated logic
- Contains: useSubtaskCache (fetch/cache subtasks), useActivityPolling (SSE + polling), useIssueDelete (deletion with undo), useStatsAnimation (badge animation), useSubtaskToggle (expand/collapse state), useIssueDetailState (modal form state), useIssueContextMenu (right-click menu)

**client/src/utils/:**
- Purpose: Pure utility functions
- Contains: api (fetch wrapper), colors (color utilities), formatters (date/text formatting), notify (Sonner toast), platform (device detection)

**client/src/styles/:**
- Purpose: Global CSS and component styles
- Contains: index.css (variables, base styles), components.css (component-specific rules), animations.css (keyframes), responsive.css (media queries), sonner.css (toast overrides)
- Pattern: CSS variables (--text-primary, --bg-primary, etc.) for theming; inline styles for component-specific overrides

**server/routes/:**
- Purpose: HTTP endpoint handlers organized by resource
- Naming: `{resource}-routes.js` (issues-routes.js, comments-routes.js, etc.)
- Pattern: Express Router, async/await, try-catch error handling
- Size: issues-routes.js is largest (338 lines with full CRUD + subtask logic)

**server/utils/:**
- Purpose: Shared utilities for routes
- Contains: activity-logger (database audit function), queries (SQL fragments)

**server/db/:**
- Purpose: Database connection and initialization
- connection.js: libSQL client with fallback to local SQLite
- init.js: CREATE TABLE statements, migrations, seed data

## Key File Locations

**Entry Points:**
- `client/src/main.jsx`: React DOM render, MantineProvider, Toaster setup
- `server/index.js`: Express app initialization, route registration, static file serving
- `client/index.html`: HTML shell with root div, loads main.jsx
- `server/db/init.js`: Database table creation (run via `npm run db:init`)

**Configuration:**
- `client/vite.config.js`: Vite build configuration (dev server, build output)
- `vitest.config.js`: Test runner configuration
- `package.json` (root): Scripts for dev, build, db:init, test
- `package.json` (client): React, Mantine, Vite dependencies
- `server/package.json`: Express, libSQL, cors dependencies
- `.env` (not in repo): TURSO_DATABASE_URL, TURSO_AUTH_TOKEN for production DB

**Core Logic:**
- `client/src/AppShell.jsx`: Context provider composition and layout structure
- `client/src/contexts/IssuesContext.jsx`: Main issue state management (reducer, fetch, mutations)
- `client/src/contexts/ActivityContext.jsx`: Activity polling/SSE listener integration
- `server/index.js`: Route registration and middleware setup
- `server/routes/issues-routes.js`: Largest route file, contains most CRUD endpoints
- `server/sse-manager.js`: Real-time event broadcasting to clients

**Testing:**
- `tests/`: Vitest test files (location may vary, check for *.test.js or *.spec.js)
- `vitest.config.js`: Test configuration

## Naming Conventions

**Files:**
- React components: PascalCase.jsx (Header.jsx, IssueCard.jsx)
- Utility files: camelCase.js (api.js, colors.js)
- Context files: {Name}Context.jsx, {Name}ContextBase.js (IssuesContext.jsx, IssuesContextBase.js)
- Route files: {resource}-routes.js (issues-routes.js, comments-routes.js)
- Hook files: use{Name}.js (useSubtaskCache.js, useActivityPolling.js)
- Config files: lowercase with dots (vite.config.js, vitest.config.js)

**Directories:**
- Feature directories: lowercase plural (components, contexts, hooks, routes, utils, styles)
- Grouping directories: descriptive plural (modals, board, layout, shared, spotlight)
- Feature sub-directories: lowercase (issue-detail, hooks under contexts)

**Functions/Exports:**
- React components: PascalCase (Board, Header, IssueCard)
- Reducer functions: camelCase + 'Reducer' suffix (issuesReducer, activityReducer)
- Custom hooks: useXxx naming (useIssues, useSubtaskCache)
- Context providers: {Name}Provider (IssuesProvider, UsersProvider)
- API functions: api.get/post/patch/delete methods
- Database functions: logActivity, issueSelectWithCounts constants

**Variables/Constants:**
- State variables: camelCase (issues, expandedIssues, currentUserId)
- Constants: UPPERCASE_SNAKE_CASE (API_BASE, COLUMNS, ACTIVITY_LOG_LIMIT)
- SQL fragments: camelCase with Select suffix (issueSelectWithCounts, subtaskSelect)

## Where to Add New Code

**New Feature (e.g., Labels):**
- API endpoints: Add new route handler in `server/routes/new-routes.js` or extend existing route file
- Database: Add table in `server/db/init.js`, add migrations if needed
- Frontend state: Add reducer case to IssuesContext or create new LabelContext in `client/src/contexts/`
- Components: Create `client/src/components/{feature}/` directory for feature-specific components
- Tests: Add test files in `tests/` mirroring feature structure

**New Component (e.g., IssueMetrics):**
- Implementation: `client/src/components/{category}/{ComponentName}.jsx` where category is board/modals/shared/layout
- If component needs state: Add context or custom hook in `client/src/hooks/`
- If component shows data from API: Use existing context hooks (useIssues, useUsers) and consume via props
- Styling: Add scoped styles to `client/src/styles/{category}.css` or inline in component

**Utilities/Helpers:**
- Shared helpers: `client/src/utils/{name}.js`
- Database utilities: `server/utils/{name}.js`
- Format/transform functions: `client/src/utils/formatters.jsx`
- Color/theming: `client/src/utils/colors.js`

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (.gitignore)
- Note: Separate node_modules at root and `client/node_modules` due to monolithic structure

**client/dist/:**
- Purpose: Built frontend (Vite output)
- Generated: Yes (by `npm run build`)
- Committed: No
- Served: In production by Express static middleware

**.planning/codebase/:**
- Purpose: Auto-generated architecture documentation
- Generated: Yes (by /gsd:map-codebase)
- Committed: Yes (for team reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**tests/:**
- Purpose: Test files for backend and frontend
- Generated: No (manually written)
- Committed: Yes
- Pattern: Vitest with co-located test files or separate `tests/` directory

## Monolithic Frontend Structure

The frontend is organized around a single-file component pattern in `client/src/AppShell.jsx` and contexts, NOT as separate page-based components:

- **App.jsx**: Root wrapper, provides UsersProvider and UIProvider
- **AppShell.jsx**: Composes all contexts (IssuesProvider, ActivityProvider, BoardProvider) and renders main layout with Header, Board, Footer
- **No routing library**: Single-page app without Next.js or React Router; all views are modals/overlays on the board

This differs from typical multi-page SPA patterns. When adding new screens, either:
1. Create a new modal component in `client/src/components/modals/` and toggle visibility via UIContext
2. Add a new context provider in AppShell if the feature needs persistent state

---

*Structure analysis: 2026-01-23*
