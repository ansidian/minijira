import { useEffect, useReducer, useRef, useCallback } from "react";
import { api } from "../utils/api";
import { useSubtasksCacheManager } from "../hooks/useSubtasksCacheManager";
import { useIssueDelete } from "../hooks/useIssueDelete";
import { useBackgroundRefresh } from "../hooks/useBackgroundRefresh";
import { notifyError, notifyUndo } from "../utils/notify";
import { IssuesContext } from "./IssuesContextBase";
import { issuesReducer, initialState } from "./issues/issuesReducer";
import { createStatusChangeActions, createIssueActions } from "./issues/issuesActions";
import { useSubtaskExpansion } from "./issues/useSubtaskExpansion";

const STATUSES = ["todo", "in_progress", "review", "done"];
const PAGE_SIZE = 20;

// Normalize date-like values to Date objects (handles dayjs, strings, Date)
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate(); // dayjs
  return new Date(value);
}

/**
 * Build URL search params for filter values.
 * Does NOT include status since we fetch per-column.
 */
function buildFilterParams(filters) {
  const params = new URLSearchParams();
  // Don't add status - we fetch per-column with explicit status
  filters.assignee?.forEach((a) =>
    params.append("assignee_id", a === "0" ? "0" : a)
  );
  filters.priority?.forEach((p) => params.append("priority", p));

  // Date range filters - normalize to Date objects first
  const createdStart = toDate(filters.createdRange?.[0]);
  const createdEnd = toDate(filters.createdRange?.[1]);
  const updatedStart = toDate(filters.updatedRange?.[0]);
  const updatedEnd = toDate(filters.updatedRange?.[1]);

  if (createdStart && createdEnd) {
    params.append('created_after', createdStart.toISOString());
    params.append('created_before', createdEnd.toISOString());
  }
  if (updatedStart && updatedEnd) {
    params.append('updated_after', updatedStart.toISOString());
    params.append('updated_before', updatedEnd.toISOString());
  }

  // Archive filter
  if (filters.showArchived) {
    params.append('show_archived', 'true');
  }

  return params.toString();
}

const EMPTY_FILTERS = {
  status: [],
  assignee: [],
  priority: [],
  myIssues: false,
  showArchived: false,
  createdRange: [null, null],
  updatedRange: [null, null],
};

export function IssuesProvider({
  children,
  currentUserId,
  selectedIssue,
  setSelectedIssue,
}) {
  const [state, dispatch] = useReducer(issuesReducer, initialState);
  const stateRef = useRef(state);
  const activeFiltersRef = useRef(EMPTY_FILTERS);
  const loadingColumnsRef = useRef(new Set());

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

  /**
   * Fetch a single column's issues with pagination and filters.
   * Returns empty result if status filter is active and this column isn't selected.
   */
  const fetchColumnData = useCallback(
    async (status, filters, cursor = null) => {
      // If status filter is active and this column isn't selected, skip fetch
      if (filters.status?.length > 0 && !filters.status.includes(status)) {
        return { issues: [], nextCursor: null, hasMore: false };
      }

      const filterParams = buildFilterParams(filters);
      // Add myIssues filter if active
      const myIssuesParam =
        filters.myIssues && currentUserId
          ? `&assignee_id=${currentUserId}`
          : "";

      const url = `/issues?status=${status}&limit=${PAGE_SIZE}${
        cursor ? `&cursor=${cursor}` : ""
      }${filterParams ? `&${filterParams}` : ""}${myIssuesParam}`;

      const response = await api.get(url);
      return response;
    },
    [currentUserId]
  );

  /**
   * Load initial data for all columns with current filters.
   * Used on mount and when filters change.
   */
  const loadPaginatedData = useCallback(
    async (filters, { silent = false } = {}) => {
      if (!silent) {
        dispatch({ type: "SET_LOADING", value: true });
        // Set all columns to loading
        STATUSES.forEach((status) => {
          dispatch({
            type: "SET_PAGINATION_STATE",
            status,
            updates: { loading: true },
          });
        });
      }

      try {
        // Fetch all columns in parallel
        const columnPromises = STATUSES.map(async (status) => {
          const response = await fetchColumnData(status, filters);
          return { status, response };
        });

        // Also fetch stats and allIssues for other features
        const [statsDataRaw, allIssuesData, ...columnResults] =
          await Promise.all([
            api.get("/stats"),
            api.get("/issues?include_subtasks=true"),
            ...columnPromises,
          ]);

        const statsData = normalizeStats(statsDataRaw);
        dispatch({ type: "SET_STATS", value: statsData });
        dispatch({ type: "SET_ALL_ISSUES", value: allIssuesData });

        // Update each column's issues and pagination state
        for (const { status, response } of columnResults) {
          // If status filter is active and this column was skipped, show 0 total
          const isFiltered = filters.status?.length > 0 && !filters.status.includes(status);
          dispatch({
            type: "SET_COLUMN_ISSUES",
            status,
            issues: response.issues,
            cursor: response.nextCursor,
            hasMore: response.hasMore,
            total: isFiltered ? 0 : (statsData[status] || response.issues.length),
          });
        }

        dispatch({ type: "SET_LOADING", value: false });
      } catch (error) {
        console.error("Failed to load paginated data:", error);
        dispatch({ type: "SET_LOADING", value: false });
        throw error;
      }
    },
    [fetchColumnData]
  );

  /**
   * Load more issues for a specific column.
   */
  const loadMoreIssues = useCallback(
    async (status) => {
      const columnState = stateRef.current.paginationState[status];

      // Prevent duplicate requests
      if (
        !columnState.hasMore ||
        columnState.loading ||
        loadingColumnsRef.current.has(status)
      ) {
        return;
      }

      loadingColumnsRef.current.add(status);
      dispatch({
        type: "SET_PAGINATION_STATE",
        status,
        updates: { loading: true },
      });

      try {
        const response = await fetchColumnData(
          status,
          activeFiltersRef.current,
          columnState.cursor
        );

        dispatch({
          type: "APPEND_ISSUES",
          status,
          issues: response.issues,
          cursor: response.nextCursor,
          hasMore: response.hasMore,
        });
      } catch (error) {
        console.error(`Failed to load more issues for ${status}:`, error);
        dispatch({
          type: "SET_PAGINATION_STATE",
          status,
          updates: { loading: false },
        });
      } finally {
        loadingColumnsRef.current.delete(status);
      }
    },
    [fetchColumnData]
  );

  /**
   * Reset pagination state (called when filters change).
   */
  const resetPagination = useCallback(() => {
    dispatch({ type: "RESET_PAGINATION" });
  }, []);

  /**
   * Legacy loadData for backwards compatibility (non-paginated full refresh).
   * Used by background refresh and other existing code.
   */
  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      // Use paginated loading with current filters
      await loadPaginatedData(activeFiltersRef.current, { silent });
    },
    [loadPaginatedData]
  );

  // NOTE: Initial load is triggered by BoardContext via loadWithFilters()
  // This ensures URL filters are respected on page refresh

  /**
   * Load data with filters - called by BoardContext when filters change.
   * Updates the activeFiltersRef for use by loadMoreIssues.
   */
  const loadWithFilters = useCallback(
    async (filters) => {
      activeFiltersRef.current = filters;
      resetPagination();
      await loadPaginatedData(filters);
    },
    [loadPaginatedData, resetPagination]
  );

  // Background refresh on tab visibility (silent, no loading indicators)
  useBackgroundRefresh(loadData);

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
    // Refresh only specific caches, not full issue list
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
      dispatch({ type: "UPDATE_ISSUE", value: updated });
      dispatch({ type: "UPDATE_IN_ALL_ISSUES", value: updated });
    }
  };

  // Wire up subtask expansion hook
  const { toggleSubtasks, toggleAllSubtasks } = useSubtaskExpansion({
    state,
    dispatch,
    cacheManager,
  });

  const setSubtasksCache = useCallback((value) => {
    if (typeof value === 'function') {
      dispatch({ type: 'SET_SUBTASKS_CACHE', value: value(stateRef.current.subtasksCache) });
    } else {
      dispatch({ type: 'SET_SUBTASKS_CACHE', value });
    }
  }, []);

  return (
    <IssuesContext.Provider
      value={{
        ...state,
        loadData,
        loadMoreIssues,
        loadWithFilters,
        resetPagination,
        fetchSubtasksForParent: cacheManager.fetchSubtasksForParent,
        refreshSubtasksCache,
        setExpandedIssues,
        setSubtasksCache,
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
