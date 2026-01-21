import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { api } from "../utils/api";
import { useSubtaskCache } from "../hooks/useSubtaskCache";

const IssuesContext = createContext(null);

const initialState = {
  issues: [],
  allIssues: [],
  stats: {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  },
  loading: true,
  expandedIssues: new Set(),
  subtasksCache: {},
};

function issuesReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.value };
    case "SET_ISSUES":
      return { ...state, issues: action.value };
    case "SET_ALL_ISSUES":
      return { ...state, allIssues: action.value };
    case "SET_STATS":
      return { ...state, stats: action.value };
    case "SET_EXPANDED_ISSUES":
      return { ...state, expandedIssues: new Set(action.value) };
    case "SET_SUBTASKS_CACHE":
      return { ...state, subtasksCache: action.value };
    case "MERGE_SUBTASKS_CACHE":
      return {
        ...state,
        subtasksCache: { ...state.subtasksCache, ...action.value },
      };
    case "UPDATE_ISSUE":
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.value.id ? action.value : issue
        ),
      };
    case "ADD_ISSUE":
      return { ...state, issues: [action.value, ...state.issues] };
    default:
      return state;
  }
}

export function IssuesProvider({
  children,
  currentUserId,
  selectedIssue,
  setSelectedIssue,
}) {
  const [state, dispatch] = useReducer(issuesReducer, initialState);
  const stateRef = useRef(state);
  const { fetchSubtasksForParent } = useSubtaskCache();
  const hasAutoExpanded = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadData = async () => {
    dispatch({ type: "SET_LOADING", value: true });
    const [issuesData, statsData, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/stats"),
      api.get("/issues?include_subtasks=true"),
    ]);
    dispatch({ type: "SET_ISSUES", value: issuesData });
    dispatch({ type: "SET_STATS", value: statsData });
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });
    dispatch({ type: "SET_LOADING", value: false });
  };

  const refreshSubtasksCache = async (issueIds) => {
    const results = await Promise.all(
      issueIds.map(async (issueId) => {
        const subtasks = await fetchSubtasksForParent(issueId);
        return { issueId, subtasks };
      })
    );

    const newCache = { ...stateRef.current.subtasksCache };
    for (const { issueId, subtasks } of results) {
      newCache[issueId] = subtasks;
    }

    dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
  };

  const setExpandedIssues = (expandedIssues) => {
    dispatch({ type: "SET_EXPANDED_ISSUES", value: expandedIssues });
  };

  const setSubtasksCache = (subtasksCache) => {
    dispatch({ type: "SET_SUBTASKS_CACHE", value: subtasksCache });
  };

  const handleStatusChange = async (issueId, newStatus) => {
    const currentIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);
    const oldStatus = currentIssue?.status;
    const isParentIssue = !currentIssue?.parent_id;

    if (oldStatus === newStatus) return;

    const updated = await api.patch(`/issues/${issueId}`, {
      status: newStatus,
      user_id: currentUserId,
    });

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
  };

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
    const updated = await api.patch(`/issues/${issueId}`, {
      ...data,
      user_id: currentUserId,
    });

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

  const deleteIssue = async (issueId) => {
    const deletedIssue =
      stateRef.current.issues.find((i) => i.id === issueId) ||
      stateRef.current.allIssues.find((i) => i.id === issueId);
    const parentId = deletedIssue?.parent_id;
    const deletedStatus = deletedIssue?.status;
    const isParentIssue = !parentId;

    await api.delete(`/issues/${issueId}`, { user_id: currentUserId });

    const [issuesData, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/issues?include_subtasks=true"),
    ]);

    dispatch({ type: "SET_ISSUES", value: issuesData });
    dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });
    setSelectedIssue?.(null);

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
          const subtasks = await fetchSubtasksForParent(expandedId);
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
  };

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
          const subtasks = await fetchSubtasksForParent(issueId);
          return { issueId, subtasks };
        })
      );
      const newCache = { ...stateRef.current.subtasksCache };
      for (const { issueId, subtasks } of results) {
        newCache[issueId] = subtasks;
      }
      dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
    }

    if (selectedIssue) {
      const updated = await api.get(`/issues/${selectedIssue.id}`);
      setSelectedIssue?.(updated);
    }
  };

  const toggleSubtasks = async (issueId) => {
    const expandedIssues = new Set(stateRef.current.expandedIssues);

    if (expandedIssues.has(issueId)) {
      expandedIssues.delete(issueId);
    } else {
      expandedIssues.add(issueId);
      if (!stateRef.current.subtasksCache[issueId]) {
        const subtasks = await fetchSubtasksForParent(issueId);
        dispatch({
          type: "MERGE_SUBTASKS_CACHE",
          value: { [issueId]: subtasks },
        });
      }
    }

    dispatch({ type: "SET_EXPANDED_ISSUES", value: expandedIssues });
  };

  const toggleAllSubtasks = async () => {
    const parentsWithSubtasks = stateRef.current.issues.filter(
      (i) => !i.parent_id && i.subtask_count > 0
    );

    const allExpanded = parentsWithSubtasks.every((i) =>
      stateRef.current.expandedIssues.has(i.id)
    );

    if (allExpanded) {
      dispatch({ type: "SET_EXPANDED_ISSUES", value: new Set() });
      return;
    }

    const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
    const missingParents = parentsWithSubtasks.filter(
      (issue) => !stateRef.current.subtasksCache[issue.id]
    );

    if (missingParents.length > 0) {
      const results = await Promise.all(
        missingParents.map(async (issue) => {
          const subtasks = await fetchSubtasksForParent(issue.id);
          return { issueId: issue.id, subtasks };
        })
      );
      const newCache = { ...stateRef.current.subtasksCache };
      for (const { issueId, subtasks } of results) {
        newCache[issueId] = subtasks;
      }
      dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
    }

    dispatch({ type: "SET_EXPANDED_ISSUES", value: newExpanded });
  };

  // Auto-expand issues with subtasks on first load
  useEffect(() => {
    if (
      !hasAutoExpanded.current &&
      state.issues.length > 0 &&
      state.expandedIssues.size === 0
    ) {
      const parentsWithSubtasks = state.issues.filter(
        (i) => !i.parent_id && i.subtask_count > 0 && i.status !== "done"
      );
      if (parentsWithSubtasks.length > 0) {
        hasAutoExpanded.current = true;
        const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
        dispatch({ type: "SET_EXPANDED_ISSUES", value: newExpanded });

        const fetchAllSubtasks = async () => {
          const results = await Promise.all(
            parentsWithSubtasks.map(async (issue) => {
              const subtasks = await fetchSubtasksForParent(issue.id);
              return { issueId: issue.id, subtasks };
            })
          );
          const newCache = { ...stateRef.current.subtasksCache };
          for (const { issueId, subtasks } of results) {
            newCache[issueId] = subtasks;
          }
          dispatch({ type: "SET_SUBTASKS_CACHE", value: newCache });
        };

        fetchAllSubtasks();
      }
    }
  }, [state.issues, state.expandedIssues.size]);

  return (
    <IssuesContext.Provider
      value={{
        ...state,
        loadData,
        fetchSubtasksForParent,
        refreshSubtasksCache,
        setExpandedIssues,
        setSubtasksCache,
        handleStatusChange,
        createIssue,
        updateIssue,
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

export function useIssues() {
  const context = useContext(IssuesContext);
  if (!context) {
    throw new Error("useIssues must be used within an IssuesProvider");
  }
  return context;
}
