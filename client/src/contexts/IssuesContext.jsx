import { useEffect, useReducer, useRef } from "react";
import { api } from "../utils/api";
import { useSubtasksCacheManager } from "../hooks/useSubtasksCacheManager";
import { useIssueDelete } from "../hooks/useIssueDelete";
import { notifyError, notifyUndo } from "../utils/notify";
import { IssuesContext } from "./IssuesContextBase";
import { issuesReducer, initialState } from "./issues/issuesReducer";
import { createStatusChangeActions, createIssueActions } from "./issues/issuesActions";
import { useSubtaskExpansion } from "./issues/useSubtaskExpansion";

export function IssuesProvider({
  children,
  currentUserId,
  selectedIssue,
  setSelectedIssue,
}) {
  const [state, dispatch] = useReducer(issuesReducer, initialState);
  const stateRef = useRef(state);

  // Centralized cache manager
  const cacheManager = useSubtasksCacheManager(
    state.subtasksCache,
    (value) => {
      if (typeof value === 'function') {
        dispatch({ type: 'SET_SUBTASKS_CACHE', value: value(stateRef.current.subtasksCache) });
      } else {
        dispatch({ type: 'SET_SUBTASKS_CACHE', value });
      }
    }
  );

  const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeStats = (rawStats) => ({
    total: toNumber(rawStats?.total),
    todo: toNumber(rawStats?.todo),
    in_progress: toNumber(rawStats?.in_progress),
    review: toNumber(rawStats?.review),
    done: toNumber(rawStats?.done),
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadData = async () => {
    dispatch({ type: "SET_LOADING", value: true });
    const [issuesData, statsDataRaw, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/stats"),
      api.get("/issues?include_subtasks=true"),
    ]);
    const statsData = normalizeStats(statsDataRaw);
    dispatch({ type: "SET_ISSUES", value: issuesData });
    dispatch({ type: "SET_STATS", value: statsData });
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });
    dispatch({ type: "SET_LOADING", value: false });
  };

  const refreshSubtasksCache = async (issueIds) => {
    const results = await Promise.all(
      issueIds.map(async (issueId) => {
        const subtasks = await cacheManager.fetchSubtasksForParent(issueId);
        return { issueId, subtasks };
      }),
    );

    const updates = {};
    for (const { issueId, subtasks } of results) {
      updates[issueId] = subtasks;
    }

    cacheManager.mergeCached(updates);
  };

  const setExpandedIssues = (expandedIssues) => {
    dispatch({ type: "SET_EXPANDED_ISSUES", value: expandedIssues });
  };

  // Wire up action factories
  const statusActions = createStatusChangeActions(dispatch, stateRef, {
    currentUserId,
    selectedIssue,
    setSelectedIssue,
    refreshSubtasksCache,
    cacheManager,
    statusLabels,
  });

  const issueActions = createIssueActions(dispatch, stateRef, {
    currentUserId,
    selectedIssue,
    setSelectedIssue,
    refreshSubtasksCache,
    cacheManager,
    statusLabels,
  });

  const { deleteIssue } = useIssueDelete({
    dispatch,
    stateRef,
    selectedIssue,
    setSelectedIssue,
    onUndo: notifyUndo,
    onError: notifyError,
    onRefreshSubtasks: cacheManager.fetchSubtasksForParent,
    getCurrentUserId: () => currentUserId,
  });

  const handleSubtaskChange = async (parentIdToExpand = null) => {
    const [issuesData, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/issues?include_subtasks=true"),
    ]);
    dispatch({ type: "SET_ISSUES", value: issuesData });
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });

    const issueIdsToRefresh = new Set(stateRef.current.expandedIssues);

    if (selectedIssue && !selectedIssue.parent_id) {
      issueIdsToRefresh.add(selectedIssue.id);
    }

    if (parentIdToExpand) {
      issueIdsToRefresh.add(parentIdToExpand);
      dispatch({
        type: "SET_EXPANDED_ISSUES",
        value: new Set([...stateRef.current.expandedIssues, parentIdToExpand]),
      });
    }

    if (issueIdsToRefresh.size > 0) {
      const results = await Promise.all(
        [...issueIdsToRefresh].map(async (issueId) => {
          const subtasks = await cacheManager.fetchSubtasksForParent(issueId);
          return { issueId, subtasks };
        }),
      );
      const updates = {};
      for (const { issueId, subtasks } of results) {
        updates[issueId] = subtasks;
      }
      cacheManager.mergeCached(updates);
    }

    if (selectedIssue) {
      const updated = await api.get(`/issues/${selectedIssue.id}`);
      setSelectedIssue?.(updated);
    }
  };

  // Wire up subtask expansion hook
  const { toggleSubtasks, toggleAllSubtasks } = useSubtaskExpansion({
    state,
    dispatch,
    cacheManager,
  });

  return (
    <IssuesContext.Provider
      value={{
        ...state,
        loadData,
        fetchSubtasksForParent: cacheManager.fetchSubtasksForParent,
        refreshSubtasksCache,
        setExpandedIssues,
        ...statusActions,
        ...issueActions,
        deleteIssue,
        handleSubtaskChange,
        toggleSubtasks,
        toggleAllSubtasks,
      }}
    >
      {children}
    </IssuesContext.Provider>
  );
}
