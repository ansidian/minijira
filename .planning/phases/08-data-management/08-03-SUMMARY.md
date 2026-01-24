---
phase: 08-data-management
plan: 03
subsystem: data-management
tags: [optimistic-updates, temporary-ids, state-management, user-experience]
dependencies:
  requires: [08-02]
  provides: [optimistic-create-infrastructure, temp-id-utils, pending-state]
  affects: [08-04, 08-05]
tech-stack:
  added: []
  patterns: [optimistic-updates, temporary-ids, collision-resistant-ids]
key-files:
  created:
    - client/src/utils/tempId.js
  modified:
    - client/src/contexts/issues/issuesReducer.js
    - client/src/contexts/issues/issuesActions.js
decisions:
  - slug: temp-id-uuid
    title: Use crypto.randomUUID() for temporary IDs
    rationale: 128-bit collision resistance prevents duplicate keys in rapid creates. Date.now() can collide within same millisecond.
  - slug: pending-flag
    title: Track pending state via _isPending flag
    rationale: Enables visual indicators (opacity, spinner) without complex state management. Simple boolean flag.
  - slug: optimistic-stats
    title: Update stats optimistically for instant feedback
    rationale: Column counts update immediately, improving perceived performance. Reverted on failure.
metrics:
  duration: 92 seconds
  completed: 2026-01-24
---

# Phase 8 Plan 3: Optimistic Update Infrastructure Summary

**One-liner:** Temp ID utilities with UUID collision resistance, reducer actions for optimistic patterns, and instant issue creation with server confirmation.

## What Was Built

### Temporary ID Utilities
Created `client/src/utils/tempId.js` with collision-resistant ID generation:
- `generateTempId()`: Uses `crypto.randomUUID()` with `temp-` prefix for 128-bit uniqueness
- `isTempId()`: Type-safe check to distinguish temporary from server IDs

### Reducer Actions for Optimistic Patterns
Added three new reducer actions to `issuesReducer.js`:
1. **REPLACE_TEMP_ISSUE**: Swaps optimistic issue with server-confirmed issue (replaces temp ID with real ID)
2. **REMOVE_ISSUE**: Removes failed optimistic creates from state
3. **SET_ISSUE_PENDING**: Toggles `_isPending` flag for visual indicators

### Optimistic Issue Creation
Refactored `createIssue` in `issuesActions.js` to follow optimistic pattern:
- Issue card appears **immediately** with temporary ID
- `_isPending: true` flag enables visual pending state
- Stats update optimistically for instant column count feedback
- On success: Replace temp ID with server ID and key
- On failure: Remove optimistic issue, revert stats, show retry toast
- Subtasks cache updated via cache manager when parent expanded

## Commits

| Hash | Message | Files |
|------|---------|-------|
| b9f3532 | feat: add tempId utilities and optimistic reducer actions | tempId.js, issuesReducer.js |
| 688fd90 | feat: implement optimistic issue creation | issuesActions.js |

## Decisions Made

1. **Temporary ID format: `temp-{uuid}`**
   - Uses browser-native `crypto.randomUUID()` for collision resistance
   - 128-bit entropy prevents duplicates even in rapid succession
   - Prefix distinguishes temp IDs from server IDs for safety checks
   - **Rejected:** Date.now() (can collide <1ms apart), incrementing counters (resets on page reload)

2. **Pending state via `_isPending` flag**
   - Simple boolean flag on optimistic issues
   - Enables CSS opacity, spinners, or skeleton overlays
   - Automatically removed when temp ID replaced with real ID
   - **Rejected:** Separate pending state object (more complex, harder to sync)

3. **Optimistic stats updates**
   - Column counts increment immediately on create
   - Provides instant visual feedback (count updates before card settles)
   - Reverted on failure to maintain accuracy
   - **Rejected:** Wait for server response (feels sluggish, defeats optimistic purpose)

## Technical Details

### Collision Resistance Analysis
`crypto.randomUUID()` provides 128-bit entropy:
- Collision probability: ~1 in 2^64 after generating 2^64 IDs
- In practice: Zero collisions for human-scale usage (thousands of creates per session)
- Comparison: Date.now() has millisecond precision, trivially collides in rapid clicks

### Optimistic Create Flow
```
1. User clicks "Create"
2. Generate temp ID: temp-{uuid}
3. Dispatch ADD_ISSUE with optimistic data (_isPending: true)
4. Update stats immediately
5. POST /issues to server
6. On success:
   - Dispatch REPLACE_TEMP_ISSUE (temp ID → real ID)
   - Update parent subtask_count if subtask
   - Add to cache if parent expanded
7. On failure:
   - Dispatch REMOVE_ISSUE
   - Revert stats
   - Show retry toast via notifyApiError
```

### Error Recovery
- Failed creates removed automatically (no ghost cards)
- Retry toast uses existing `notifyApiError` pattern with retry button
- Stats reverted with `Math.max(0, ...)` to prevent negative counts
- Cache manager integration ensures subtasks cache stays in sync

## Issues Encountered

None - plan executed exactly as written.

## Deviations from Plan

None - all tasks completed as specified.

## Next Phase Readiness

**Blockers:** None

**Follow-up work:**
1. **08-04 (parallel)**: Apply optimistic patterns to status updates, assignments, deletes
2. **08-05**: Add visual pending indicators (opacity, spinners) for `_isPending` issues

**Technical debt:** None introduced

**Concerns:**
- Visual indicators not yet implemented - optimistic issues have `_isPending` flag but no UI treatment
- Only create is optimistic - updates/deletes still synchronous (addressed in 08-04)

## Testing Notes

**Verification performed:**
- ✅ tempId.js exports generateTempId and isTempId
- ✅ Reducer has REPLACE_TEMP_ISSUE, REMOVE_ISSUE, SET_ISSUE_PENDING actions
- ✅ createIssue uses generateTempId and sets _isPending flag
- ✅ Build succeeds without errors

**Manual testing required (08-05):**
1. Network throttling to "Slow 3G"
2. Create issue - should appear instantly with null key
3. After POST completes - key should fill in
4. Simulate failure (stop server) - issue should disappear with retry toast

## Documentation

**User-facing changes:**
- Issue cards now appear instantly when creating (no loading wait)
- Column counts update immediately on create
- Failed creates show retry button (network/5xx errors)

**Developer notes:**
- Always use `generateTempId()` for optimistic creates, never Date.now()
- Check `isTempId(id)` before assuming server ID
- Use REPLACE_TEMP_ISSUE to swap temp with real, not UPDATE_ISSUE
- Optimistic issues have `_isPending: true` - use for visual indicators

## Related Work

**Built upon:**
- 08-01: Cache manager provides addCachedSubtask for subtask creates
- 08-02: Existing notifyApiError pattern used for retry toasts

**Enables:**
- 08-04: Optimistic status updates, assignments, deletes using same infrastructure
- 08-05: Visual pending indicators via `_isPending` flag

**Dependencies:**
- Uses existing `notifyApiError` from `utils/notify.jsx`
- Uses existing `api.post` from `utils/api.js`
- Integrates with cache manager from 08-01
