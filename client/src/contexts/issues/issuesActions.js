// Note: stateRef pattern is used for reading state in async callbacks.
// Full stale closure elimination requires React 19.2+ useEffectEvent.
// Functional state updates used where feasible to mitigate stale closures.

import { api } from "../../utils/api";
import { notifyError, notifyUndo, notifyApiError } from "../../utils/notify";
import { generateTempId } from "../../utils/tempId";

export function createStatusChangeActions(dispatch, stateRef, deps) {
  const { currentUserId, selectedIssue, setSelectedIssue, refreshSubtasksCache, statusLabels } = deps;

  const applyStatusChange = async (issueId, newStatus, { showUndo = true, showErrors = true } = {}) => {
    const currentIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);
    const oldStatus = currentIssue?.status;
    const isParentIssue = !currentIssue?.parent_id;

    if (oldStatus === newStatus) return;

    try {
      const updated = await api.patch(`/issues/${issueId}`, { status: newStatus, user_id: currentUserId });
      dispatch({ type: "UPDATE_ISSUE", value: updated });

      if (isParentIssue && oldStatus && oldStatus !== newStatus) {
        dispatch({
          type: "SET_STATS",
          value: {
            ...stateRef.current.stats,
            [oldStatus]: Math.max(0, stateRef.current.stats[oldStatus] - 1),
            [newStatus]: stateRef.current.stats[newStatus] + 1,
          },
        });
      }

      if (selectedIssue?.id === issueId) {
        setSelectedIssue?.(updated);
      }

      const { expandedIssues } = stateRef.current;

      if (updated.subtask_count > 0 && expandedIssues.has(issueId)) {
        await refreshSubtasksCache([issueId]);
      }

      if (updated.parent_id && expandedIssues.has(updated.parent_id)) {
        await refreshSubtasksCache([updated.parent_id]);
      }

      // Update allIssues with the updated issue
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: updated });

      if (updated.parent_id) {
        const parentIssue = await api.get(`/issues/${updated.parent_id}`);
        dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
        dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: parentIssue });
      }

      if (showUndo) {
        const issueTitle = currentIssue?.title || "item";
        notifyUndo({
          title: "Status changed",
          message: `Moved "${issueTitle}" to ${statusLabels[newStatus] || newStatus}.`,
          onUndo: () => applyStatusChange(issueId, oldStatus, { showUndo: false }),
        });
      }
    } catch (error) {
      if (showErrors) {
        notifyError("Failed to change status.");
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
  const { currentUserId, selectedIssue, setSelectedIssue, refreshSubtasksCache, statusLabels } = deps;

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

    // Update stats immediately for parent issues
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

      // Revert stats
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
    const updated = await api.patch(`/issues/${issueId}`, { ...data, user_id: currentUserId });
    dispatch({ type: "UPDATE_ISSUE", value: updated });
    dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: updated });

    if (selectedIssue?.id === issueId) {
      setSelectedIssue?.(updated);
    }

    if (updated.parent_id) {
      if (stateRef.current.expandedIssues.has(updated.parent_id)) {
        await refreshSubtasksCache([updated.parent_id]);
      }

      const parentIssue = await api.get(`/issues/${updated.parent_id}`);
      dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: parentIssue });
    }

    return updated;
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
            notifyError("Failed to undo change.");
          }
        },
      });

      return updated;
    } catch (error) {
      notifyError("Failed to update issue.");
      return undefined;
    }
  };

  return { createIssue, updateIssue, updateIssueWithUndo };
}
