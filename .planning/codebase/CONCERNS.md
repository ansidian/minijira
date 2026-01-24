# Codebase Concerns

**Analysis Date:** 2026-01-23

## Tech Debt

**Large monolithic React components:**
- Issue: Multiple pages worth of logic in single files (`Header.jsx` 385 lines, `SubtasksSection.jsx` 322 lines, `IssuesContext.jsx` 481 lines)
- Files: `client/src/contexts/IssuesContext.jsx`, `client/src/components/layout/Header.jsx`, `client/src/components/modals/SubtasksSection.jsx`
- Impact: Difficult to test, hard to reason about, increases cognitive load for changes, difficult to extract reusable logic
- Fix approach: Break components into smaller, focused pieces; extract custom hooks for complex state logic; move utility functions to standalone modules

**Stale reference pattern with useRef:**
- Issue: `stateRef` in `IssuesContext.jsx` maintains manual reference to state to work around closure issues, scattered throughout the file (lines 63, 88, etc.)
- Files: `client/src/contexts/IssuesContext.jsx` (lines 63, 105-182, 232-257, etc.)
- Impact: Creates potential for accessing stale state; makes it harder to track which value is current vs stale; increases likelihood of bugs when state updates
- Fix approach: Refactor to use proper dependency arrays in `useEffect` hooks; consider extracting state management to a custom hook with clear dependency tracking

**API client lacks error handling:**
- Issue: `api` utility (`client/src/utils/api.js`) doesn't check response status or handle errors consistently - just calls `.json()` on all responses
- Files: `client/src/utils/api.js` (lines 4-30)
- Impact: Failed requests silently pass through; errors from server aren't distinguishable from valid responses; causes downstream components to receive malformed data
- Fix approach: Add status checking; throw errors with descriptive messages; differentiate between network errors and server errors; add retry logic where appropriate

**Subtasks cache synchronization inconsistencies:**
- Issue: Multiple places manage subtasks cache (`toggleSubtasks`, `toggleAllSubtasks`, `refreshSubtasksCache`, `handleSubtaskChange`), each with slightly different logic
- Files: `client/src/contexts/IssuesContext.jsx` (lines 105-422), `client/src/hooks/useSubtaskCache.js`, `client/src/hooks/useIssueDelete.js`
- Impact: Changes in one area can create cache inconsistencies; difficult to ensure all code paths properly invalidate/update cache
- Fix approach: Centralize cache management into a single hook or context provider; define clear rules for when cache should be invalidated

**Excessive data refetching:**
- Issue: Many operations fetch full issue list from server multiple times (`applyStatusChange`, `createIssue`, `updateIssue`, `deleteIssue` all fetch `/issues` and `/issues?include_subtasks=true`)
- Files: `client/src/contexts/IssuesContext.jsx` (lines 91-101, 129-196, 210-229, 232-257)
- Impact: Network overhead; increases latency on every mutation; scales poorly as data grows
- Fix approach: Use server response for optimistic updates; only refetch when necessary; implement differential sync or partial updates

**Console logging left in production code:**
- Issue: 9 instances of `console.error()` in client source code, left without warning comments or proper error reporting
- Files: `client/src/hooks/useActivityPolling.js`, `client/src/components/modals/ActivityLogModal.jsx`, `client/src/components/modals/SubtasksSection.jsx` (lines 106, 123, 149)
- Impact: Silent failures in production; errors not captured or reported; hard to debug user issues
- Fix approach: Replace `console.error()` with proper error tracking; add error boundaries; notify users of issues

---

## Known Bugs

**Stats update doesn't account for subtasks:**
- Issue: Only parent issues affect stats counts; moving subtask to different status doesn't update stats, but moving parent does
- Files: `client/src/contexts/IssuesContext.jsx` (lines 150-159), `server/routes/issues-routes.js` (line 236)
- Trigger: Create a subtask, move it to "done" status; the main stats counter won't reflect it
- Workaround: Move parent issue to see accurate count

**Concurrent deletion can corrupt state:**
- Issue: `useIssueDelete` hook stores snapshot but doesn't prevent multiple concurrent deletes of same issue; second delete might undo work
- Files: `client/src/hooks/useIssueDelete.js` (lines 14-146)
- Trigger: Rapidly click delete multiple times before 7-second timer expires
- Impact: Confusing undo behavior; state becomes inconsistent

**Stats normalization missing type safety:**
- Issue: `normalizeStats()` in `IssuesContext` attempts to handle non-numeric values, but doesn't validate that required fields exist
- Files: `client/src/contexts/IssuesContext.jsx` (lines 79-85)
- Impact: Silent failures; if API returns malformed stats, UI shows undefined values instead of failing visibly

---

## Security Considerations

**No authentication or authorization:**
- Risk: Anyone with access to the API can create, modify, or delete any issue; user identity is client-side only (localStorage)
- Files: `client/src/contexts/UsersContext.jsx`, `server/index.js`
- Current mitigation: None - relies on network isolation (not accessible from outside)
- Recommendations: Implement proper auth if exposed to internet; at minimum, add CSRF tokens; validate user_id on server side; don't trust client-side user selection

**Client-side user impersonation:**
- Risk: Any user can set `localStorage.setItem("minijira_user", anyId)` to act as anyone
- Files: `client/src/contexts/UsersContext.jsx` (localStorage usage)
- Current mitigation: None
- Recommendations: Use signed JWTs or session cookies; server must validate and set user context; never accept user_id from client

**No input validation on issue keys:**
- Risk: Issue key prefix "JPL-" is hardcoded in two places; if changed inconsistently, could corrupt data
- Files: `server/index.js` (line 111), `server/db/init.js`
- Current mitigation: Database constraint checks only status/priority values
- Recommendations: Move key prefix to environment config; validate all inputs server-side; implement schema validation

**CORS is wide open:**
- Risk: `app.use(cors())` with no origin restrictions
- Files: `server/index.js` (line 18)
- Current mitigation: None
- Recommendations: Restrict CORS to specific origin in production; whitelist allowed domains

---

## Performance Bottlenecks

**N+1 query problem on issue listing:**
- Problem: Main board loads parent issues; expanding subtasks triggers separate query per parent
- Files: `server/routes/issues-routes.js` (lines 49-63), `client/src/contexts/IssuesContext.jsx` (lines 369-386)
- Cause: Subtasks fetched one parent at a time when expanding, even if multiple parents expand simultaneously
- Improvement path: Batch fetch subtasks for multiple parents in single request; add `/issues/subtasks?parent_ids=[1,2,3]` endpoint

**Heavy DOM rendering on large issue lists:**
- Problem: Header component calculates stats by summing all counts; Board renders all columns and issues without virtualization
- Files: `client/src/components/layout/Header.jsx` (lines 29-35), `client/src/components/board/Board.jsx`
- Cause: Even with 100+ issues, all rendered to DOM at once
- Improvement path: Implement virtual scrolling for columns; memoize expensive calculations; debounce stat updates

**Subquery overhead in every issue fetch:**
- Problem: Every issue request runs two subqueries to count subtasks
- Files: `server/utils/queries.js` (lines 11-12)
- Cause: Counting happens on every fetch even when subtask count not displayed
- Improvement path: Add optional `with_counts=true` parameter; cache counts separately; denormalize counts to parent table

**SSE heartbeat at 30-second intervals:**
- Problem: Creates unnecessary traffic; affects battery on mobile devices
- Files: `server/sse-manager.js` (line 21)
- Cause: Keeping connections alive for activity polling
- Improvement path: Use adaptive heartbeat based on client visibility; switch to polling with exponential backoff on mobile

---

## Fragile Areas

**Subtask cache and expanded issues state:**
- Files: `client/src/contexts/IssuesContext.jsx` (lines 19-20, 369-422), `client/src/hooks/useSubtaskCache.js`, `client/src/hooks/useIssueDelete.js`
- Why fragile: Two separate pieces of state (`expandedIssues` Set and `subtasksCache` object) that must stay synchronized; cache can become stale; Set mutations are hard to trace
- Safe modification: Always use `dispatch()` for updates; add invariant tests to verify cache matches expanded state; add logging for state transitions
- Test coverage: Multiple places update cache but not all paths are tested; `useIssueDelete` has complex snapshot logic that needs integration tests

**Issue deletion with undo and 7-second delay:**
- Files: `client/src/hooks/useIssueDelete.js` (lines 83-144)
- Why fragile: Maintains optimistic state, then reverts if server fails; snapshot stored in ref; multiple concurrent deletes can interfere; undo callback can be called after deletion completes
- Safe modification: Never delete or undo same issue twice; ensure cleanup always runs; validate snapshot exists before restoring; add timeout to prevent stale undos
- Test coverage: Race condition tests exist but don't cover all edge cases (e.g., rapid undo + new delete, network timeout during undo)

**Stats calculations across multiple state sources:**
- Files: `client/src/contexts/IssuesContext.jsx` (lines 11-17, 79-85, 150-159, 216-223), `server/routes/stats-routes.js`
- Why fragile: Stats can come from three places (reducer state, API response, or computed from issues list); not always synchronized
- Safe modification: Always normalize stats after API calls; add validation that computed stats match server stats; don't compute stats on client
- Test coverage: No test verifies stats stay consistent after multiple operations; no test for stats with many subtasks

**Activity log SSE events can lag:**
- Files: `server/sse-manager.js`, `client/src/contexts/ActivityContext.jsx`, `client/src/hooks/useActivityPolling.js`
- Why fragile: Events sent via SSE but also polled; if connection drops briefly, events missed; no ordering guarantees
- Safe modification: Use server-provided timestamps; verify events in correct order before applying; handle duplicate events
- Test coverage: No tests for SSE reliability; no tests for out-of-order event handling

---

## Scaling Limits

**Database query complexity with subqueries:**
- Current capacity: Works fine with <1000 issues, subqueries on every fetch become slow at 10k+
- Limit: Subquery counts on `issues.*` multiplied for each row; O(n²) complexity with deep subtask trees
- Scaling path: Denormalize counts to parent; use materialized views; implement count-only endpoint separate from detail fetch

**Memory usage for expanded subtasks:**
- Current capacity: Can hold ~100-200 expanded issue subtasks in cache before noticeable slowdown
- Limit: Every subtask in cache is a full object in memory; no garbage collection of old caches
- Scaling path: Implement LRU cache with size limits; periodically clean old cached subtasks; use IndexedDB for larger caches

**SSE client connections:**
- Current capacity: Handles ~100 concurrent connections on small server
- Limit: All clients stored in memory; no clustering or load balancing
- Scaling path: Add Redis pub/sub for multi-server broadcasting; implement client pooling; add connection limits per IP

**Activity log table unbounded growth:**
- Current capacity: Stores all activity forever; no pruning; performance acceptable with <50k rows
- Limit: Full table scan for activity queries becomes slow; database file grows indefinitely
- Scaling path: Archive old activity; add retention policy; implement pagination with cursor; index on user_id and issue_id

---

## Dependencies at Risk

**@libsql/client 0.6.0 - actively developed:**
- Risk: Early version number; API may change; limited maturity in production
- Impact: Upgrades could break code; community size smaller than traditional SQLite libraries
- Migration plan: Monitor releases; pin version until 1.0; consider migration to better-supported client if issues arise

**sonner 2.0.7 - toast library with no rollback UI:**
- Risk: Single dependency for critical UX (undo buttons); if library has bugs, no toast functionality
- Impact: Users can't see notifications or undo actions
- Migration plan: Consider implementing custom toast instead; or add fallback notification mechanism; ensure tests cover toast failure scenarios

---

## Missing Critical Features

**No transaction support across operations:**
- Problem: Creating issue + setting assignee + creating comment happens in separate requests; any can fail independently leaving partial state
- Blocks: Atomic multi-step operations; rollback on partial failure
- Impact: Database inconsistency possible if network fails mid-operation

**No concurrent edit prevention:**
- Problem: Two users can edit same issue simultaneously; last write wins
- Blocks: Safe collaborative editing; preventing accidental overwrites
- Impact: Data loss; frustration in multi-user scenarios

**No pagination or filtering beyond basic query params:**
- Problem: All issues loaded at once; no way to filter by reporter or other complex criteria
- Blocks: Usability with 1000+ issues; specific issue finding; admin features
- Impact: UI becomes unusable as data grows; memory leaks from massive lists

**No audit trail or soft deletes:**
- Problem: Deleted issues are gone forever; no way to see who deleted what or when
- Blocks: Compliance requirements; accidental deletion recovery; audit requirements
- Impact: Can't recover from mistakes; no compliance audit trail

---

## Test Coverage Gaps

**Concurrent operations not fully tested:**
- What's not tested: Race conditions in issue creation + subtask creation; concurrent subtask deletions; concurrent status changes on parent + child
- Files: `tests/race-conditions.test.js`, `client/src/contexts/IssuesContext.jsx`
- Risk: Data corruption under load; stats become incorrect; deleted issues reappear; cache inconsistencies
- Priority: High - affects data integrity

**State synchronization edge cases:**
- What's not tested: What happens when API fails mid-deletion and undo is called; concurrent undo operations; undo after state changed; subtask cache invalidated while user has detail modal open
- Files: `client/src/hooks/useIssueDelete.js`, `client/src/contexts/IssuesContext.jsx`
- Risk: Stale state displayed; undo broken; orphaned state refs; silent failures
- Priority: High - affects core operations

**API error handling:**
- What's not tested: 500 errors from server; malformed JSON responses; network timeouts; API returning wrong data structure
- Files: `tests/api.test.js`, `client/src/utils/api.js`
- Risk: Silent failures; uncaught exceptions; user confusion about what went wrong
- Priority: Medium - affects reliability

**LSH (localStorage) usage and persistence:**
- What's not tested: localStorage quota exceeded; localStorage disabled; user selection persisted across sessions; activity viewing timestamp
- Files: `client/src/contexts/UsersContext.jsx`, `client/src/hooks/useActivityPolling.js`
- Risk: User selection lost; activity viewed state lost; can't clear localStorage; private browsing breaks features
- Priority: Medium - affects UX

---

*Concerns audit: 2026-01-23*
