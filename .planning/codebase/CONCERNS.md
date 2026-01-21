# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**3400+ Line Monolithic Frontend File:**
- Issue: Entire React application lives in a single file `client/src/App.jsx` (3432 lines)
- Files: `client/src/App.jsx`
- Impact: Difficult to navigate, high cognitive load, merge conflicts likely in team environments, performance implications (entire file re-parses on changes)
- Fix approach: Extract components into separate files (`components/IssueCard.jsx`, `components/CreateIssueModal.jsx`, `components/ActivityLogModal.jsx`, etc.), extract hooks into `hooks/` directory, move utilities to `utils/` directory

**Hardcoded Project Key Prefix:**
- Issue: Project key prefix "JPL-" is hardcoded in two separate locations, seed data uses different prefix "MJ-"
- Files: `server/index.js` (line 232), `server/db/init.js` (line 214 uses "MJ-", rest uses "JPL-")
- Impact: Inconsistent seeded data, requires manual code changes in multiple places to customize, prone to desync between locations
- Fix approach: Extract to environment variable or single config file, update seed script to use same prefix as production code

**Manual Schema Migrations via Try-Catch:**
- Issue: Database schema changes use try-catch blocks to silently ignore errors if columns already exist
- Files: `server/db/init.js` (lines 74-91 for `issue_key`, `issue_title`, `previous_status` columns)
- Impact: Migration failures are hidden, no tracking of which migrations have run, impossible to know database schema version, rollback not possible
- Fix approach: Implement proper migration system (e.g., `node-pg-migrate`, `knex`, or custom migrations table tracking version numbers)

**Deleted Activity Logs:**
- Issue: Activity log automatically deletes old entries beyond 20 most recent on every insert
- Files: `server/index.js` (lines 26, 35-41 in `logActivity` function)
- Impact: Permanent loss of audit trail data, no way to investigate historical issues or user behavior patterns
- Fix approach: Either remove deletion logic entirely, or implement archival strategy (move to separate table, export to log files, increase limit significantly)

**Activity Log References Deleted Issues:**
- Issue: `activity_log.issue_id` uses `ON DELETE SET NULL`, but retains `issue_key` and `issue_title` separately
- Files: `server/db/init.js` (line 48)
- Impact: Orphaned activity log entries with partial data, inconsistent data model (issue ID nullified but key/title remain)
- Fix approach: Either use `ON DELETE CASCADE` to fully remove activity when issue deleted, or remove the foreign key constraint entirely and rely solely on denormalized `issue_key`/`issue_title`

**No Request Deduplication on Backend:**
- Issue: Multiple concurrent requests for subtasks can cause duplicate database queries
- Files: `client/src/App.jsx` (lines 522-549 implement client-side deduplication, but backend has no protection)
- Impact: Wasted database queries, potential race conditions if results arrive out of order
- Fix approach: Implement request coalescing or caching layer on backend

## Known Bugs

**Inconsistent Project Key Prefix in Seed Data:**
- Symptoms: Seed data creates issues with "MJ-" prefix, but new issues use "JPL-" prefix
- Files: `server/db/init.js` (line 214)
- Trigger: Running `npm run db:init` creates "MJ-" issues, but creating new issues via API generates "JPL-" keys
- Workaround: Manually change line 214 to use "JPL-" to match production code

**SSE Memory Leak on Client Disconnect:**
- Symptoms: Heartbeat intervals continue running after client disconnect if cleanup doesn't execute properly
- Files: `server/sse-manager.js` (lines 16-22)
- Trigger: Client disconnect before heartbeat interval fires or network interruption
- Workaround: Heartbeat will eventually detect disconnected client and clear itself, but intervals accumulate

## Security Considerations

**No Authentication or Authorization:**
- Risk: Any user can view, modify, or delete any data. User identity is purely client-side (localStorage) and trivially spoofed
- Files: All API endpoints in `server/index.js` (lines 64-612), `client/src/App.jsx` (lines 509-512 for user selection)
- Current mitigation: None - documented as "Zero Config Auth: Trust your small team" feature
- Recommendations: Add at minimum basic auth middleware, JWT tokens, or session cookies. Validate user_id on server side. Document this is NOT suitable for untrusted environments

**No Input Sanitization:**
- Risk: Stored XSS via issue titles, descriptions, comments. SQL injection unlikely due to parameterized queries but malicious content can be stored and rendered
- Files: `server/index.js` (no validation beyond required field checks), `client/src/App.jsx` (renders user content directly)
- Current mitigation: React automatically escapes JSX preventing XSS execution, but malicious links still clickable
- Recommendations: Add server-side input validation library (e.g., `validator.js`), sanitize HTML/script tags, limit field lengths

**No Rate Limiting:**
- Risk: API endpoints can be spammed infinitely, causing database overload or DoS
- Files: `server/index.js` (no rate limiting middleware)
- Current mitigation: None
- Recommendations: Add `express-rate-limit` middleware to API endpoints, especially write operations (POST/PATCH/DELETE)

**Environment Variables in Client Build:**
- Risk: Potential exposure if environment variables are accidentally bundled into client code
- Files: `client/vite.config.js` (no explicit env filtering visible)
- Current mitigation: No sensitive env vars currently used in client
- Recommendations: Explicitly whitelist allowed env vars in Vite config, audit build output for leaks

**CORS Wide Open:**
- Risk: Any origin can make requests to API
- Files: `server/index.js` (line 14: `app.use(cors())` with no options)
- Current mitigation: None
- Recommendations: Restrict CORS to specific origins in production via `cors({ origin: process.env.ALLOWED_ORIGIN })`

## Performance Bottlenecks

**N+1 Query Problem for Subtask Counts:**
- Problem: Every issue fetch includes two subqueries to count total and done subtasks
- Files: `server/index.js` (lines 106-107, 182-183, 257-259, 396-397)
- Cause: Subqueries executed per-row instead of JOINed or aggregated
- Improvement path: Use LEFT JOIN with GROUP BY to compute counts in single query, or cache counts in parent issue table and update via triggers

**Full Table Scan for Activity Deletion:**
- Problem: Deleting old activity logs requires sorting entire table to identify top 20
- Files: `server/index.js` (lines 36-40)
- Cause: `ORDER BY created_at DESC LIMIT 20` on full table, then DELETE on inverse
- Improvement path: Index already exists on `created_at`, but query could be optimized to use window functions or row_number

**Client Fetches All Issues on Every SSE Event:**
- Problem: Every issue update triggers full reload of all issues, subtasks, stats, and users
- Files: `client/src/App.jsx` (lines 686, 669 calling `loadData()`)
- Cause: Simplistic synchronization strategy
- Improvement path: Implement incremental updates - SSE events should include changed data and client should merge into existing state

**Expanded Subtasks Fetch on Every Parent Expand:**
- Problem: Collapsing and re-expanding a parent re-fetches subtasks even if cached
- Files: `client/src/App.jsx` (lines 818-840 implement caching, but cache is cleared on issue updates)
- Cause: Overly aggressive cache invalidation
- Improvement path: Implement smarter cache invalidation - only invalidate specific parent when its subtasks change, not all caches

## Fragile Areas

**SSE State Synchronization with Stale Closures:**
- Files: `client/src/App.jsx` (lines 525-529, 657-658, 725 use refs to avoid stale closures)
- Why fragile: SSE event handlers capture state at component mount, refs used to get current values but pattern is error-prone
- Safe modification: Always use refs for values read inside SSE handlers, never directly access state. Add thorough comments explaining closure scope
- Test coverage: No automated tests for SSE synchronization behavior

**Issue Key Counter Race Conditions:**
- Files: `server/index.js` (lines 228-232), `tests/race-conditions.test.js` (lines 27-82)
- Why fragile: Relies on database atomic `UPDATE...RETURNING` to prevent duplicate keys
- Safe modification: Do not change to separate SELECT then UPDATE. Maintain RETURNING clause. Test suite validates concurrent behavior
- Test coverage: Comprehensive race condition tests exist in `tests/race-conditions.test.js`

**Subtasks Cache Invalidation Logic:**
- Files: `client/src/App.jsx` (lines 713-721, 755-761)
- Why fragile: Multiple code paths update subtasks cache (SSE events, manual actions, deletion cleanup), easy to miss a path
- Safe modification: Always update cache through centralized `setSubtasksCache` calls, never directly mutate. Document all cache invalidation triggers
- Test coverage: No automated tests for cache consistency

**Activity Log Timestamp Parsing:**
- Files: `client/src/App.jsx` (lines 101-102: `dateStr.replace(" ", "T") + "Z"`)
- Why fragile: Assumes SQLite datetime format "YYYY-MM-DD HH:MM:SS" and manually converts to ISO 8601
- Safe modification: Do not change SQLite datetime format or this parsing will break. Consider server-side ISO 8601 formatting
- Test coverage: No automated tests for timestamp parsing

**DELETE CASCADE on Subtasks:**
- Files: `server/db/init.js` (line 29: `parent_id INTEGER REFERENCES issues(id) ON DELETE CASCADE`)
- Why fragile: Deleting a parent issue silently deletes all subtasks, no warning to user, no way to recover
- Safe modification: Consider soft deletes instead, or require explicit confirmation before cascading delete
- Test coverage: No automated tests for cascade delete behavior

## Scaling Limits

**Single SQLite File in Production:**
- Current capacity: SQLite handles ~1M rows easily, but single-writer limitation exists
- Limit: Concurrent writes will serialize, causing latency under load
- Scaling path: Turso (libSQL) provides replication and distribution, but still ultimately SQLite. For high-concurrency, migrate to PostgreSQL

**Server-Sent Events Connection Limits:**
- Current capacity: Node.js default max sockets ~65k, but realistic limit much lower (~10k concurrent SSE connections)
- Limit: Each SSE client holds open HTTP connection indefinitely, exhausting server resources
- Scaling path: Move to WebSockets with connection pooling, or use managed service like Pusher/Ably for pub/sub

**No Pagination on Issues List:**
- Current capacity: All parent issues fetched on every page load
- Limit: Breaks down around 1000+ issues (slow API response, large JSON payload, client rendering lag)
- Scaling path: Implement cursor-based pagination, virtual scrolling, or infinite scroll

**Activity Log Hardcoded 20 Item Limit:**
- Current capacity: Only retains 20 most recent activity entries
- Limit: Any historical activity beyond last 20 actions is permanently deleted
- Scaling path: Remove deletion logic, implement proper archival/rotation, add pagination to activity log API

## Dependencies at Risk

**Mantine v7.x:**
- Risk: Rapidly evolving UI library, breaking changes common between major versions
- Impact: Upgrading to v8 will likely require significant refactoring of component props and styling
- Migration plan: Pin to `^7.0.0` in package.json until resources available for migration, monitor Mantine changelog

**@libsql/client 0.6.0:**
- Risk: Relatively new package, API not stable (currently pre-1.0)
- Impact: Database client changes could require rewriting all query code
- Migration plan: Pin exact version `0.6.0` not `^0.6.0`, test thoroughly before any upgrades

**No Linting or Formatting:**
- Risk: Code style will drift without eslint/prettier, especially in team environment
- Impact: Merge conflicts, inconsistent code quality, harder to review
- Migration plan: Add `eslint` and `prettier` with standard configs, run `--fix` on entire codebase

## Missing Critical Features

**No Database Backups:**
- Problem: Production Turso database has no automated backup strategy documented
- Blocks: Disaster recovery, accidental deletion recovery, point-in-time restore
- Priority: High - Single database failure loses all data

**No Error Tracking:**
- Problem: Backend errors only logged to console, no aggregation or alerting
- Blocks: Production debugging, error rate monitoring, user impact assessment
- Priority: Medium - Errors currently invisible until user reports

**No Logging Infrastructure:**
- Problem: Only console.log used, no structured logging, no log aggregation
- Blocks: Production debugging, audit trails, security incident investigation
- Priority: Medium - Consider adding `winston` or `pino` logger

**No Health Check Endpoint:**
- Problem: No `/health` or `/status` endpoint to verify service is running
- Blocks: Proper monitoring, load balancer health checks, uptime tracking
- Priority: Low - Render provides basic uptime monitoring, but explicit endpoint better

## Test Coverage Gaps

**No Frontend Tests:**
- What's not tested: All React components, user interactions, drag-and-drop, context menus, SSE handling
- Files: `client/src/App.jsx` (0% coverage)
- Risk: UI regressions undetected, refactoring breaks functionality silently
- Priority: High - 3400 line file with zero automated tests

**No API Integration Tests for Comments:**
- What's not tested: Comment creation, retrieval, user association, activity logging
- Files: `server/index.js` (lines 470-542 comment endpoints)
- Risk: Breaking changes to comment API go unnoticed
- Priority: Medium - Comments are core feature

**No SSE Tests:**
- What's not tested: SSE connection, disconnection, heartbeat, event broadcasting, client reconnection
- Files: `server/sse-manager.js` (0% coverage), `server/index.js` (lines 48-58)
- Risk: Real-time sync can break without detection, memory leaks undetected
- Priority: Medium - SSE is critical for multi-user experience

**No Migration Tests:**
- What's not tested: Schema migrations, rollback capability, idempotency
- Files: `server/db/init.js` (lines 74-91)
- Risk: Production database corruption during schema changes
- Priority: High - Manual migrations very risky

**No Deletion Cascade Tests:**
- What's not tested: Deleting parent issue deletes subtasks, orphaned comments handling, activity log cleanup
- Files: Foreign key constraints in `server/db/init.js`
- Risk: Data loss or orphaned records not validated
- Priority: Medium - Deletes are destructive

---

*Concerns audit: 2026-01-20*
