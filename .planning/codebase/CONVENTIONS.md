# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- Component files: Single-file frontend architecture - all React components in `client/src/App.jsx`
- Backend files: Descriptive names - `server/index.js`, `server/db/connection.js`, `server/db/init.js`, `server/sse-manager.js`
- Test files: Pattern `*.test.js` in `tests/` directory (e.g., `tests/api.test.js`, `tests/race-conditions.test.js`)
- Utility files: Pattern `*-utils.js` for helpers (e.g., `tests/test-utils.js`)
- Config files: Standard patterns - `package.json`, `vite.config.js`

**Functions:**
- camelCase for all functions: `formatDate`, `relativeTime`, `linkifyText`, `logActivity`, `waitForServer`
- Async functions explicitly declared with `async` keyword
- API wrapper methods match HTTP verbs: `api.get()`, `api.post()`, `api.patch()`, `api.delete()`
- React components use PascalCase: `App`, `Column`, `IssueCard`, `CreateIssueModal`, `ActivityLogModal`

**Variables:**
- camelCase for local variables: `issueId`, `subtaskCount`, `currentUser`
- UPPER_SNAKE_CASE for constants: `API_BASE`, `COLUMNS`, `ACTIVITY_LOG_LIMIT`
- Boolean variables use `is` or `has` prefix: `isSubtask`, `isTouchDevice`, `isMac`
- Destructured parameters common in function signatures and API responses

**Types:**
- Database column names use snake_case: `assignee_id`, `created_at`, `parent_id`, `issue_key`
- Object properties in API responses match database snake_case
- Query parameters use snake_case: `include_subtasks`, `parent_id`, `assignee_id`

## Code Style

**Formatting:**
- No explicit formatter configured (no .prettierrc, .eslintrc detected)
- Indentation: 2 spaces (consistent across all files)
- Line length: No strict limit observed (lines up to ~100 characters common)
- Semicolons: Not used in frontend (`client/src/App.jsx`), used in backend (`server/index.js`)
- Quotes: Double quotes in backend, mixed in frontend
- Trailing commas: Inconsistent (present in some object literals, absent in others)

**Linting:**
- No linting config detected (.eslintrc, eslint.config.js not found)
- No explicit code quality tools configured

## Import Organization

**Order:**
1. External dependencies (React, Mantine, third-party)
2. Internal utilities and helpers
3. Styles (CSS imports)

**Frontend Pattern (`client/src/App.jsx`):**
```javascript
import { useState, useEffect, useRef, useMemo } from "react";
import { version } from "../package.json";
import { Loader, Center, Button, Modal, ... } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
```

**Backend Pattern (`server/index.js`):**
```javascript
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import db from "./db/connection.js";
import sseManager from "./sse-manager.js";
```

**Path Aliases:**
- None configured
- All imports use relative paths (`./`, `../`) or package names
- Backend uses explicit `.js` extensions for ES modules

## Error Handling

**Patterns:**

**Backend API endpoints:**
- Try-catch blocks wrap all async operations
- Errors return JSON with `error` property: `res.status(500).json({ error: err.message })`
- Validation errors return 400: `res.status(400).json({ error: "Title is required" })`
- Not found errors return 404: `res.status(404).json({ error: "Issue not found" })`
- Success responses return appropriate status codes (200, 201, 204)

**Frontend API calls:**
- No error handling in `api` object - throws errors directly
- Errors propagate to calling code
- Test utilities catch and parse JSON error responses:
```javascript
if (!res.ok) {
  const error = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(error.error || `HTTP ${res.status}`);
}
```

**Database operations:**
- Migration code uses try-catch to ignore "column exists" errors
- Test cleanup ignores errors (issue might already be deleted)

## Logging

**Framework:** Console methods (`console.log`, `console.error`)

**Patterns:**

**Server logging:**
- Connection events: `console.log(\`✓ MiniJira API running at http://localhost:\${PORT}\`)`
- SSE events: `console.log(\`SSE client connected. Total clients: \${this.clients.size}\`)`
- Database init: `console.log("Database initialized")`
- Error logging: `console.error('Error sending SSE message to client:', error)`

**Client logging:**
- No console logging in production code
- No structured logging framework

**Test logging:**
- No explicit logging in tests (rely on test framework output)

## Comments

**When to Comment:**
- File-level docstrings for test files explaining purpose and usage
- Section dividers in large files using banner comments:
```javascript
// ============================================================================
// USERS
// ============================================================================
```
- Inline comments for non-obvious logic or business rules
- Migration code comments to explain purpose

**JSDoc/TSDoc:**
- Not used
- No type annotations or function documentation
- Test utility functions have simple docstring comments:
```javascript
/**
 * Wait for server to be available
 */
export async function waitForServer(maxAttempts = 10, delayMs = 500) {
```

## Function Design

**Size:**
- Backend endpoints: 20-80 lines typical
- React components: Inline in single file, range from 20-200+ lines
- Helper functions: 10-50 lines typical
- Large functions common (e.g., main `App` component is 2300+ lines)

**Parameters:**
- Destructured objects for multiple related parameters
- API functions use single object parameter: `api.post(path, data)`
- React components use props object
- Default parameters common: `formatDate(dateStr)`, `waitForServer(maxAttempts = 10, delayMs = 500)`

**Return Values:**
- Backend endpoints return JSON via `res.json()`
- API functions return promises that resolve to parsed JSON
- Helper functions return primitive values or objects
- React components return JSX
- No explicit return type documentation

## Module Design

**Exports:**

**Backend:**
- Default export for singletons: `export default db`, `export default new SSEManager()`
- Named exports for utilities: `export const api = { ... }`
- Test utilities use named exports: `export class TestCleanup { ... }`

**Frontend:**
- Single default export for main App component
- No modularization (entire frontend in one file)

**Barrel Files:**
- Not used
- No index.js re-export patterns

## Database Conventions

**Table naming:**
- Plural lowercase: `users`, `issues`, `comments`, `counters`, `activity_log`

**Column naming:**
- snake_case: `assignee_id`, `created_at`, `issue_key`, `parent_id`
- Foreign keys: `{table}_id` pattern
- Timestamps: `created_at`, `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**SQL style:**
- Uppercase keywords in schema definitions
- Parameterized queries using `?` placeholders
- Template literals for complex multi-line queries

## API Conventions

**Endpoint patterns:**
- RESTful structure: `GET /api/users`, `POST /api/issues`, `PATCH /api/issues/:id`
- Nested resources: `GET /api/issues/:id/comments`, `GET /api/issues/:id/subtasks`
- Query parameters for filtering: `?status=todo`, `?include_subtasks=true`

**Request/Response format:**
- JSON content type
- Snake_case for all JSON keys (matching database)
- Timestamps as SQLite datetime strings

**Status codes:**
- 200 for successful GET/PATCH
- 201 for successful POST
- 204 for successful DELETE
- 400 for validation errors
- 404 for not found
- 500 for server errors

---

*Convention analysis: 2026-01-20*
