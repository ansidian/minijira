# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Improved code quality, testability, and reliability
**Current focus:** Phase 8 - Data Management

## Current Position

Phase: 8 of 8 (Data Management)
Plan: 5 of 5 in current phase (Wave 4 complete)
Status: Phase complete
Last activity: 2026-01-24 — Completed 08-05-PLAN.md

Progress: [==============] 100.0% (12/12 plans complete across all phases)

## Completed Milestones

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1.0 | Discord Integration | 1-4 | 2026-01-24 |

See: .planning/MILESTONES.md for details.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.0]: Native fetch over axios for HTTP client
- [v1.0]: Database queue over in-memory for persistence
- [v1.1]: ApiError includes HTTP method in message for debugging context
- [v1.1]: Error classes re-exported from api.js for single-file imports
- [v1.1]: Category property distinguishes network/client/server errors
- [v1.1]: Retry button shown for network errors and 5xx server errors only, not client errors
- [v1.1]: ThemedToaster placed outside ErrorBoundary so toasts work during error states
- [v1.1]: Subtask status and field update errors show specific operation names in toast
- [v1.1]: Activity log fetch errors show 'load activity log' operation name
- [v1.1]: Desktop subtask toggle kept inline in Header.jsx (part of core layout)
- [v1.1]: Custom hooks extract complex state logic for reusability and testability
- [v1.1]: Presentational components separate UI from business logic for composition
- [v1.1]: Cache manager receives state and setter from parent, doesn't own state
- [v1.1]: Functional state updates handled via wrapper in IssuesContext for cache operations
- [v1.1]: Fetch deduplication integrated into cache manager from old useSubtaskCache
- [v1.1]: Server response data trusted as source of truth for mutations
- [v1.1]: Full refetch only on tab visibility after 30+ seconds inactive
- [v1.1]: Parent issue fetched only for subtask_count updates, not full list
- [v1.1]: Temporary IDs use crypto.randomUUID() with temp- prefix for collision resistance
- [v1.1]: Optimistic issues tracked via _isPending flag for visual indicators
- [v1.1]: Failed creates removed and stats reverted on error
- [v1.1]: Snapshot entire issue for rollback, not just changed fields (simpler, more reliable)
- [v1.1]: _iPending flag set during optimistic phase, removed when server confirms
- [v1.1]: Stats updates are immediate for parent issues (consistent with status change UX)
- [v1.1]: notifyApiError provides retry button instead of generic error toast
- [v1.1]: Subtask hooks use local state for modal context, not cache manager
- [v1.1]: Ghost animation duration 500ms for visual closure on failed creates
- [v1.1]: Rollback restores subtask at original position for better UX

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 08-05-PLAN.md (Phase 8 complete)
Resume file: None

**Next step:** Phase 8 (Data Management) complete. All optimistic update patterns implemented and tested.
