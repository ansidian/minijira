import { useRef } from "react";
import { api } from "../utils/api";

export function useIssueDelete({
  dispatch,
  stateRef,
  selectedIssue,
  setSelectedIssue,
  onUndo,
  onError,
  onRefreshSubtasks,
  getCurrentUserId,
}) {
  const pendingDeletesRef = useRef(new Map());

  const deleteIssue = async (issueId) => {
    const userId = getCurrentUserId();
    const deletedIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);

    if (!deletedIssue) return;

    const existingPending = pendingDeletesRef.current.get(issueId);
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
      pendingDeletesRef.current.delete(issueId);
    }

    const parentId = deletedIssue.parent_id;
    const deletedStatus = deletedIssue.status;
    const isParentIssue = !parentId;

    const snapshot = {
      issues: [...stateRef.current.issues],
      allIssues: [...stateRef.current.allIssues],
      stats: { ...stateRef.current.stats },
      expandedIssues: new Set(stateRef.current.expandedIssues),
      subtasksCache: { ...stateRef.current.subtasksCache },
      selectedIssue,
    };

    const updatedIssues = stateRef.current.issues.filter(
      (issue) => issue.id !== issueId
    );
    const updatedAllIssues = stateRef.current.allIssues.filter(
      (issue) => issue.id !== issueId && issue.parent_id !== issueId
    );

    dispatch({ type: "SET_ISSUES", value: updatedIssues });
    dispatch({ type: "SET_ALL_ISSUES", value: updatedAllIssues });

    if (selectedIssue?.id === issueId) {
      setSelectedIssue?.(null);
    }

    if (isParentIssue && deletedStatus) {
      dispatch({
        type: "SET_STATS",
        value: {
          ...stateRef.current.stats,
          total: Math.max(0, (stateRef.current.stats.total || 0) - 1),
          [deletedStatus]: Math.max(0, stateRef.current.stats[deletedStatus] - 1),
        },
      });
    }

    const optimisticExpanded = new Set(stateRef.current.expandedIssues);
    if (optimisticExpanded.has(issueId)) {
      optimisticExpanded.delete(issueId);
      dispatch({ type: "SET_EXPANDED_ISSUES", value: optimisticExpanded });
    }

    const optimisticCache = { ...stateRef.current.subtasksCache };
    delete optimisticCache[issueId];
    if (parentId && optimisticCache[parentId]) {
      optimisticCache[parentId] = optimisticCache[parentId].filter(
        (subtask) => subtask.id !== issueId
      );
    }
    dispatch({ type: "SET_SUBTASKS_CACHE", value: optimisticCache });

    const timeoutId = setTimeout(async () => {
      try {
        await api.delete(`/issues/${issueId}`, { user_id: userId });

        const [issuesData, allIssuesData, statsData] = await Promise.all([
          api.get("/issues"),
          api.get("/issues?include_subtasks=true"),
          api.get("/stats"),
        ]);

        dispatch({ type: "SET_ISSUES", value: issuesData });
        dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });
        dispatch({ type: "SET_STATS", value: statsData });
        setSelectedIssue?.(null);

        const expandedIssues = new Set(stateRef.current.expandedIssues);
        if (expandedIssues.has(issueId)) {
          expandedIssues.delete(issueId);
          dispatch({ type: "SET_EXPANDED_ISSUES", value: expandedIssues });
        }

        const expandedIds = [...expandedIssues].filter((id) => id !== issueId);
        if (parentId && expandedIssues.has(parentId)) {
          expandedIds.push(parentId);
        }

        if (expandedIds.length > 0) {
          const results = await Promise.all(
            expandedIds.map(async (expandedId) => {
              const subtasks = await onRefreshSubtasks(expandedId);
              return { issueId: expandedId, subtasks };
            })
          );
          const newCache = { ...stateRef.current.subtasksCache };
          delete newCache[issueId];
          for (const { issueId: id, subtasks } of results) {
            newCache[id] = subtasks;
          }
          dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
        } else {
          const newCache = { ...stateRef.current.subtasksCache };
          delete newCache[issueId];
          dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
        }
      } catch (error) {
        dispatch({ type: "SET_ISSUES", value: snapshot.issues });
        dispatch({ type: "SET_ALL_ISSUES", value: snapshot.allIssues });
        dispatch({ type: "SET_STATS", value: snapshot.stats });
        dispatch({
          type: "SET_EXPANDED_ISSUES",
          value: new Set(snapshot.expandedIssues),
        });
        dispatch({
          type: "SET_SUBTASKS_CACHE",
          value: { ...snapshot.subtasksCache },
        });
        setSelectedIssue?.(snapshot.selectedIssue || null);
        onError("Failed to delete issue.");
      } finally {
        pendingDeletesRef.current.delete(issueId);
      }
    }, 7000);

    pendingDeletesRef.current.set(issueId, { timeoutId, snapshot });

    onUndo({
      title: isParentIssue ? "Issue deleted" : "Subtask deleted",
      message: `Deleted "${deletedIssue.title}".`,
      onUndo: () => {
        const pending = pendingDeletesRef.current.get(issueId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingDeletesRef.current.delete(issueId);
        dispatch({ type: "SET_ISSUES", value: pending.snapshot.issues });
        dispatch({ type: "SET_ALL_ISSUES", value: pending.snapshot.allIssues });
        dispatch({ type: "SET_STATS", value: pending.snapshot.stats });
        dispatch({
          type: "SET_EXPANDED_ISSUES",
          value: new Set(pending.snapshot.expandedIssues),
        });
        dispatch({
          type: "SET_SUBTASKS_CACHE",
          value: { ...pending.snapshot.subtasksCache },
        });
        setSelectedIssue?.(pending.snapshot.selectedIssue || null);
      },
    });
  };

  return { deleteIssue };
}
