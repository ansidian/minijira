# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- Backend routes: `kebab-case` with `-routes.js` suffix (e.g., `users-routes.js`, `issues-routes.js`)
- Backend utilities: `kebab-case` (e.g., `sse-manager.js`, `activity-logger.js`)
- Frontend components: `PascalCase.jsx` (e.g., `Board.jsx`, `Column.jsx`)
- Frontend contexts: `PascalCase` with `Context` suffix (e.g., `IssuesContext.jsx`, `UIContext.jsx`)
- Frontend hooks: `camelCase` with `use` prefix (e.g., `useSubtaskCache.js`, `useBoard.js`)
- Frontend utilities: `camelCase.js` (e.g., `api.js`, `colors.js`, `notify.jsx`)
- Test files: `descriptive.test.js` (e.g., `api.test.js`, `race-conditions.test.js`)

**Functions:**
- Async route handlers: `(req, res) => { ... }` arrow function style
- Utility functions: `camelCase` (e.g., `fetchSubtasksForParent`, `logActivity`, `waitForServer`)
- Custom hooks: `use` prefix with `camelCase` (e.g., `useSubtaskCache`, `useUI`)
- Component functions: `PascalCase` (e.g., `IssuesProvider`, `UIProvider`)
- Helper functions: `camelCase` (e.g., `normalizeStats`, `uniqueTitle`, `getPriorityColor`)

**Variables:**
- State variables: `camelCase` (e.g., `selectedIssue`, `showCreateModal`, `expandedIssues`)
- Database table names: `snake_case` (e.g., `activity_log`, `issue_key`)
- Database column names: `snake_case` (e.g., `assignee_id`, `parent_id`, `avatar_color`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `ACTIVITY_LOG_LIMIT`, `API_BASE`, `CANVAS_DND_TOAST_ID`)
- Request/response field names: `snake_case` (e.g., `assignee_id`, `reporter_id`, `subtask_count`)

**Types/Objects:**
- React Context objects: `PascalCase` (e.g., `UIContext`, `IssuesContext`)
- Reducer action types: `UPPER_SNAKE_CASE` (e.g., `SET_LOADING`, `SET_ISSUES`, `UPDATE_ISSUE`)
- Event type names: `snake_case` (e.g., `issue_created`, `status_changed`, `comment_added`)

## Code Style

**Formatting:**
- No explicit formatter (Prettier/ESLint) configured at root level
- Consistent use of 2-space indentation observed
- JavaScript modules use ES6 `import`/`export` syntax (`"type": "module"` in package.json)
- Single-file convention: Frontend React UI in `client/src/App.jsx` (no component files)

**Linting:**
- No linting configuration found; code relies on manual review and vitest for validation
- Unused variables and imports are not automatically caught

## Import Organization

**Order:**
1. External library imports (`express`, `cors`, `@libsql/client`, `react`, Mantine components)
2. Relative imports from project modules (`.../db`, `.../utils`, `.../routes`)
3. React hooks and context imports

**Path Aliases:**
- No path aliases configured (full relative paths used throughout)
- Backend: paths like `../db/connection.js`, `../utils/queries.js`
- Frontend: paths like `../utils/api`, `../contexts/UIContext`

**Example (Backend - `server/routes/issues-routes.js`):**
```javascript
import express from "express";
import db from "../db/connection.js";
import sseManager from "../sse-manager.js";
import { logActivity } from "../utils/activity-logger.js";
import { issueSelectWithCounts, subtaskSelect } from "../utils/queries.js";
```

**Example (Frontend - `client/src/contexts/IssuesContext.jsx`):**
```javascript
import { useEffect, useReducer, useRef } from "react";
import { api } from "../utils/api";
import { useSubtaskCache } from "../hooks/useSubtaskCache";
```

## Error Handling

**Patterns:**
- Backend: Try-catch in route handlers with standardized error responses
  ```javascript
  router.get("/", async (req, res) => {
    try {
      const { rows } = await db.execute("SELECT * FROM users ORDER BY name");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  ```
- HTTP error codes: 400 for validation, 404 for not found, 500 for server errors
- Error messages: Plain string format (e.g., `"Title is required"`, `"User not found"`)
- Database errors: Messages passed through directly from error object
- Client-side: No error boundary observed; rely on API response error handling in try-catch
- Test utilities: Errors wrapped in Error objects thrown from API wrapper

**Error throwing in context hooks:**
- React context hooks throw errors if used outside provider
  ```javascript
  export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
      throw new Error("useUI must be used within a UIProvider");
    }
    return context;
  }
  ```

## Logging

**Framework:** `console` methods (no structured logging library)

**Patterns:**
- Backend: `console.error()` for SSE broadcast failures in `server/sse-manager.js`
- Frontend: No explicit logging observed (relies on browser DevTools)
- Test utilities: No logging, silent failures or generic error messages

**When to log:**
- Server startup success: `console.log('✓ MiniJira API running at ...')`
- Errors in broadcast operations: `console.error('Error sending SSE message to client:', error)`

## Comments

**When to Comment:**
- Block-level section markers: `// ========== SECTION NAME ==========` (used in test files)
- JSDoc-style comments for test utilities explaining purpose and usage
- In-code comments for non-obvious logic (e.g., cleanup order considerations)
- Notes about behavior changes (e.g., "// Last status in sequence")

**JSDoc/TSDoc:**
- Minimal usage; found only in test utilities (`test-utils.js`) with basic JSDoc blocks
- Example from `test-utils.js`:
  ```javascript
  /**
   * Simple fetch wrapper for API calls
   */
  export const api = { ... }

  /**
   * Track created resources for cleanup
   */
  export class TestCleanup { ... }
  ```
- No strict JSDoc enforcement on backend routes or client components

## Function Design

**Size:**
- Route handlers: 20-40 lines typical (build and execute database query + error handling)
- Reducer functions: 10-30 lines (switch statement with action handling)
- Utility functions: 5-20 lines (focused, single responsibility)
- Custom hooks: 10-25 lines (state setup + side effect handling)

**Parameters:**
- Route handlers: Always `(req, res)` for Express routes
- Database queries: Parametrized using `{ sql, args }` object format (prevent SQL injection)
  ```javascript
  db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [req.params.id],
  })
  ```
- Component/hook props: Destructured in function signature
- Optional parameters: Default values used (e.g., `maxAttempts = 10, delayMs = 500`)

**Return Values:**
- Route handlers: No explicit return, response sent via `res.json()` or `res.status().json()`
- Utility functions: Return data directly (arrays, objects, booleans, promises)
- React hooks: Return objects with action/state methods
  ```javascript
  export function useSubtaskCache() {
    return { fetchSubtasksForParent };
  }
  ```
- Async functions: Return promises with resolved data

## Module Design

**Exports:**
- Backend routes: Single `export default router` per route file
- Utilities: Named exports for functions/constants
  ```javascript
  export const api = { ... }
  export function waitForServer() { ... }
  export class TestCleanup { ... }
  ```
- Frontend contexts: Named exports for provider and hook
  ```javascript
  export function UIProvider({ children }) { ... }
  export function useUI() { ... }
  ```

**Barrel Files:**
- Not used; all imports are direct file references
- `server/utils/queries.js` acts as a query template module (not a barrel)
  ```javascript
  export const issueSelect = `...`
  export const issueSelectWithCounts = `...`
  ```

## State Management

**Frontend:**
- Reducer pattern used in contexts (`useReducer`)
- State shape includes arrays, sets, and objects:
  ```javascript
  const initialState = {
    issues: [],
    expandedIssues: new Set(),
    subtasksCache: {},
    stats: { total: 0, todo: 0, ... }
  };
  ```
- Actions dispatched as objects with `type` and `value` properties
  ```javascript
  dispatch({ type: "SET_ISSUES", value: issuesData })
  dispatch({ type: "UPDATE_ISSUE", value: updatedIssue })
  ```

**Backend:**
- No state management; stateless Express routes
- SSE manager maintains client connections (singleton instance in `server/sse-manager.js`)
- Test cleanup utility tracks resources for teardown

---

*Convention analysis: 2026-01-23*
