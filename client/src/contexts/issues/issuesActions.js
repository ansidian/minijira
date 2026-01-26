// Note: stateRef pattern is used for reading state in async callbacks.
// Full stale closure elimination requires React 19.2+ useEffectEvent.
// Functional state updates used where feasible to mitigate stale closures.

import { api } from "../../utils/api";
import { notifyError, notifyUndo, notifyApiError } from "../../utils/notify";
import { generateTempId } from "../../utils/tempId";

export function createStatusChangeActions(dispatch, stateRef, deps) {
  const { getCurrentUserId, selectedIssue, setSelectedIssue, refreshSubtasksCache, statusLabels, cacheManager } = deps;

  const applyStatusChange = async (issueId, newStatus, { showUndo = true, showErrors = true } = {}) => {
    // Get fresh user ID to avoid stale closure issues
    const currentUserId = getCurrentUserId();

    if (!currentUserId) {
      console.error('[Status Change] Cannot change status without a selected user');
      if (showErrors) {
        notifyError('Please select yourself before making changes');
      }
      return;
    }

    const currentIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);
    const oldStatus = currentIssue?.status;
    const isParentIssue = !currentIssue?.parent_id;

    if (oldStatus === newStatus) return;
    if (!currentIssue) return;

    // 1. Snapshot for rollback
    const snapshot = { ...currentIssue };

    // 2. Optimistic update - instant visual feedback
    const optimisticIssue = { ...currentIssue, status: newStatus, _isPending: true };
    dispatch({ type: "UPDATE_ISSUE", value: optimisticIssue });
    dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: optimisticIssue });

    // Update stats and pagination totals immediately for parent issues
    if (isParentIssue) {
      dispatch({
        type: "SET_STATS",
        value: {
          ...stateRef.current.stats,
          [oldStatus]: Math.max(0, stateRef.current.stats[oldStatus] - 1),
          [newStatus]: stateRef.current.stats[newStatus] + 1,
        },
      });
      dispatch({
        type: "SET_PAGINATION_STATE",
        status: oldStatus,
        updates: { total: Math.max(0, (stateRef.current.paginationState[oldStatus]?.total || 0) - 1) },
      });
      dispatch({
        type: "SET_PAGINATION_STATE",
        status: newStatus,
        updates: { total: (stateRef.current.paginationState[newStatus]?.total || 0) + 1 },
      });
    }

    try {
      // 3. Server mutation
      const updated = await api.patch(`/issues/${issueId}`, { status: newStatus, user_id: currentUserId });

      // 4. Replace optimistic with server response (remove pending)
      dispatch({ type: "UPDATE_ISSUE", value: { ...updated, _isPending: false } });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: updated });

      if (selectedIssue?.id === issueId) {
        setSelectedIssue?.(updated);
      }

      // 5. Handle cache invalidation for subtasks
      const { expandedIssues } = stateRef.current;

      if (updated.subtask_count > 0 && expandedIssues.has(issueId)) {
        cacheManager?.invalidateCache([issueId]);
        // Refetch this parent's subtasks
        const subtasks = await cacheManager?.fetchSubtasksForParent(issueId);
        if (subtasks) cacheManager?.setCached(issueId, subtasks);
      }

      if (updated.parent_id && expandedIssues.has(updated.parent_id)) {
        cacheManager?.invalidateCache([updated.parent_id]);
        const subtasks = await cacheManager?.fetchSubtasksForParent(updated.parent_id);
        if (subtasks) cacheManager?.setCached(updated.parent_id, subtasks);
      }

      // 6. Update parent's subtask counts if this is a subtask
      if (updated.parent_id) {
        const parentIssue = await api.get(`/issues/${updated.parent_id}`);
        dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
        dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: parentIssue });
      }

      // 7. Show undo notification
      if (showUndo) {
        const issueTitle = currentIssue?.title || "item";
        notifyUndo({
          title: "Status changed",
          message: `Moved "${issueTitle}" to ${statusLabels[newStatus] || newStatus}.`,
          onUndo: () => applyStatusChange(issueId, oldStatus, { showUndo: false }),
        });
      }
    } catch (error) {
      // 8. Rollback on failure
      dispatch({ type: "UPDATE_ISSUE", value: { ...snapshot, _isPending: false } });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: snapshot });

      // Revert stats and pagination totals
      if (isParentIssue) {
        dispatch({
          type: "SET_STATS",
          value: {
            ...stateRef.current.stats,
            [oldStatus]: stateRef.current.stats[oldStatus] + 1,
            [newStatus]: Math.max(0, stateRef.current.stats[newStatus] - 1),
          },
        });
        dispatch({
          type: "SET_PAGINATION_STATE",
          status: oldStatus,
          updates: { total: (stateRef.current.paginationState[oldStatus]?.total || 0) + 1 },
        });
        dispatch({
          type: "SET_PAGINATION_STATE",
          status: newStatus,
          updates: { total: Math.max(0, (stateRef.current.paginationState[newStatus]?.total || 0) - 1) },
        });
      }

      if (showErrors) {
        notifyApiError({
          error,
          operation: "change status",
          onRetry: () => applyStatusChange(issueId, newStatus, { showUndo, showErrors }),
        });
      }
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    await applyStatusChange(issueId, newStatus);
  };

  const handleStatusChangeSilent = async (issueId, newStatus) => {
    await applyStatusChange(issueId, newStatus, { showUndo: false, showErrors: false });
  };

  return { applyStatusChange, handleStatusChange, handleStatusChangeSilent };
}

export function createIssueActions(dispatch, stateRef, deps) {
  const { getCurrentUserId, selectedIssue, setSelectedIssue, refreshSubtasksCache, statusLabels } = deps;

  const createIssue = async (data) => {
    const tempId = generateTempId();

    // Create optimistic issue with temp ID
    const optimisticIssue = {
      ...data,
      id: tempId,
      key: null, // Server will assign, shows as placeholder
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtask_count: 0,
      subtask_done_count: 0,
      _isPending: true, // For visual indicator
    };

    // 1. Add optimistically - issue appears immediately
    dispatch({ type: "ADD_ISSUE", value: optimisticIssue });
    dispatch({ type: "ADD_TO_ALL_ISSUES", value: optimisticIssue });

    // Update stats and pagination total immediately for parent issues
    if (!data.parent_id) {
      const status = data.status || "todo";
      dispatch({
        type: "SET_STATS",
        value: {
          ...stateRef.current.stats,
          total: (stateRef.current.stats.total || 0) + 1,
          [status]: stateRef.current.stats[status] + 1,
        },
      });
      dispatch({
        type: "SET_PAGINATION_STATE",
        status,
        updates: { total: (stateRef.current.paginationState[status]?.total || 0) + 1 },
      });
    }

    try {
      // 2. Create on server
      const created = await api.post("/issues", data);

      // 3. Replace temp with real - gets server-assigned key and ID
      dispatch({
        type: "REPLACE_TEMP_ISSUE",
        tempId,
        value: created,
      });

      // 4. If subtask, update parent's subtask_count
      if (created.parent_id) {
        const parent = await api.get(`/issues/${created.parent_id}`);
        dispatch({ type: "UPDATE_ISSUE", value: parent });
        dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: parent });

        // Add to parent's subtasks cache if expanded
        const { expandedIssues } = stateRef.current;
        if (expandedIssues.has(created.parent_id)) {
          // Use cache manager to add subtask
          deps.cacheManager?.addCachedSubtask(created.parent_id, created);
        }
      }

      return created;
    } catch (error) {
      // 5. Remove optimistic issue on failure
      dispatch({ type: "REMOVE_ISSUE", id: tempId });

      // Revert stats and pagination total
      if (!data.parent_id) {
        const status = data.status || "todo";
        dispatch({
          type: "SET_STATS",
          value: {
            ...stateRef.current.stats,
            total: Math.max(0, (stateRef.current.stats.total || 0) - 1),
            [status]: Math.max(0, stateRef.current.stats[status] - 1),
          },
        });
        dispatch({
          type: "SET_PAGINATION_STATE",
          status,
          updates: { total: Math.max(0, (stateRef.current.paginationState[status]?.total || 0) - 1) },
        });
      }

      // 6. Show error with retry
      notifyApiError({
        error,
        operation: "create issue",
        onRetry: () => createIssue(data),
      });

      throw error;
    }
  };

  const updateIssue = async (issueId, data) => {
    // Get fresh user ID to avoid stale closure issues
    const currentUserId = getCurrentUserId();

    if (!currentUserId) {
      console.error('[Update Issue] Cannot update issue without a selected user');
      throw new Error('No user selected');
    }

    const currentIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);

    if (!currentIssue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    // 1. Snapshot for rollback
    const snapshot = { ...currentIssue };

    // 2. Optimistic update - instant visual feedback
    const optimisticIssue = { ...currentIssue, ...data, _isPending: true };
    dispatch({ type: "UPDATE_ISSUE", value: optimisticIssue });
    dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: optimisticIssue });

    if (selectedIssue?.id === issueId) {
      setSelectedIssue?.(optimisticIssue);
    }

    try {
      // 3. Server mutation
      const updated = await api.patch(`/issues/${issueId}`, { ...data, user_id: currentUserId });

      // 4. Replace optimistic with server response (remove pending)
      dispatch({ type: "UPDATE_ISSUE", value: { ...updated, _isPending: false } });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: updated });

      if (selectedIssue?.id === issueId) {
        setSelectedIssue?.(updated);
      }

      // 5. Handle cache invalidation for subtasks
      if (updated.parent_id) {
        if (stateRef.current.expandedIssues.has(updated.parent_id)) {
          deps.cacheManager?.invalidateCache([updated.parent_id]);
          const subtasks = await deps.cacheManager?.fetchSubtasksForParent(updated.parent_id);
          if (subtasks) deps.cacheManager?.setCached(updated.parent_id, subtasks);
        }

        const parentIssue = await api.get(`/issues/${updated.parent_id}`);
        dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
        dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: parentIssue });
      }

      return updated;
    } catch (error) {
      // 6. Rollback on failure
      dispatch({ type: "UPDATE_ISSUE", value: { ...snapshot, _isPending: false } });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: snapshot });

      if (selectedIssue?.id === issueId) {
        setSelectedIssue?.(snapshot);
      }

      // 7. Re-throw to let caller handle notification
      throw error;
    }
  };

  const updateIssueWithUndo = async (issueId, data) => {
    const currentIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);

    if (!currentIssue) return undefined;

    const previousValues = Object.keys(data).reduce((acc, key) => {
      acc[key] = currentIssue[key];
      return acc;
    }, {});

    try {
      const updated = await updateIssue(issueId, data);
      const issueTitle = currentIssue?.title || "item";
      const assigneeUpdated = Object.prototype.hasOwnProperty.call(data, "assignee_id");
      let title = "Issue updated";
      let message = `Updated "${issueTitle}".`;
      if (data.status) {
        title = "Status changed";
        message = `Moved "${issueTitle}" to ${statusLabels[data.status] || data.status}.`;
      } else if (data.priority) {
        title = "Priority changed";
        message = `Set "${issueTitle}" priority to ${data.priority}.`;
      } else if (assigneeUpdated) {
        title = "Assignee changed";
        message = data.assignee_id ? `Updated assignee for "${issueTitle}".` : `Unassigned "${issueTitle}".`;
      }

      notifyUndo({
        title,
        message,
        onUndo: async () => {
          try {
            await updateIssue(issueId, previousValues);
          } catch (error) {
            notifyApiError({
              error,
              operation: "undo change",
              onRetry: () => updateIssue(issueId, previousValues),
            });
          }
        },
      });

      return updated;
    } catch (error) {
      // Determine operation name for better error messages
      let operation = "update issue";
      if (data.priority) {
        operation = "change priority";
      } else if (data.assignee_id !== undefined) {
        operation = "change assignee";
      } else if (data.title || data.description) {
        operation = "update issue";
      }

      notifyApiError({
        error,
        operation,
        onRetry: () => updateIssueWithUndo(issueId, data),
      });

      return undefined;
    }
  };

  return { createIssue, updateIssue, updateIssueWithUndo };
}
