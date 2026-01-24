// Note: stateRef pattern is used for reading state in async callbacks.
// Full stale closure elimination requires React 19.2+ useEffectEvent.
// Functional state updates used where feasible to mitigate stale closures.

import { api } from "../../utils/api";
import { notifyError, notifyUndo } from "../../utils/notify";

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

      if (updated.parent_id) {
        const parentIssue = await api.get(`/issues/${updated.parent_id}`);
        dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
      }

      const allIssuesData = await api.get("/issues?include_subtasks=true");
      dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });

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
    const newIssue = await api.post("/issues", data);
    dispatch({ type: "ADD_ISSUE", value: newIssue });

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

    const allIssuesData = await api.get("/issues?include_subtasks=true");
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });

    return newIssue;
  };

  const updateIssue = async (issueId, data) => {
    const updated = await api.patch(`/issues/${issueId}`, { ...data, user_id: currentUserId });
    dispatch({ type: "UPDATE_ISSUE", value: updated });

    if (selectedIssue?.id === issueId) {
      setSelectedIssue?.(updated);
    }

    if (updated.parent_id) {
      if (stateRef.current.expandedIssues.has(updated.parent_id)) {
        await refreshSubtasksCache([updated.parent_id]);
      }

      const parentIssue = await api.get(`/issues/${updated.parent_id}`);
      dispatch({ type: "UPDATE_ISSUE", value: parentIssue });
    }

    const allIssuesData = await api.get("/issues?include_subtasks=true");
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });

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
