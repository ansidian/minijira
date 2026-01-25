import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useIssues } from "./hooks/useIssues";
import { useUsers } from "./UsersContext";
import { useUI } from "./UIContext";
import { BoardContext } from "./BoardContextBase";

const INITIAL_FILTERS = {
  status: [],
  assignee: [],
  priority: [],
  myIssues: false,
};

// Parse filters from URL on initial load
function getFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.getAll('status'),
    assignee: params.getAll('assignee'),
    priority: params.getAll('priority'),
    myIssues: params.get('my') === 'true',
  };
}

export function BoardProvider({ children }) {
  const {
    issues,
    expandedIssues,
    subtasksCache,
    paginationState,
    handleStatusChange,
    updateIssue,
    updateIssueWithUndo,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
    loadMoreIssues,
    loadWithFilters,
  } = useIssues();
  const { users, currentUserId } = useUsers();
  const { setAutoShowSubtaskForm, setSelectedIssue } = useUI();
  const isInitialMount = useRef(true);

  // Filter panel state - initialize from URL
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() => {
    const urlFilters = getFiltersFromUrl();
    // Check if any filters are set in URL
    const hasUrlFilters =
      urlFilters.status.length > 0 ||
      urlFilters.assignee.length > 0 ||
      urlFilters.priority.length > 0 ||
      urlFilters.myIssues;
    return hasUrlFilters ? urlFilters : INITIAL_FILTERS;
  });

  const activeFilterCount =
    activeFilters.status.length +
    activeFilters.assignee.length +
    activeFilters.priority.length +
    (activeFilters.myIssues ? 1 : 0);

  // Handle filter changes - trigger server-side fetch and sync URL
  const handleFiltersChange = useCallback(
    (filters) => {
      setActiveFilters(filters);

      // Sync to URL on apply
      const params = new URLSearchParams(window.location.search);
      // Clear existing filter params
      params.delete('status');
      params.delete('assignee');
      params.delete('priority');
      params.delete('my');
      // Add new values
      filters.status?.forEach(s => params.append('status', s));
      filters.assignee?.forEach(a => params.append('assignee', a));
      filters.priority?.forEach(p => params.append('priority', p));
      if (filters.myIssues) params.set('my', 'true');

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Server-side filtering - fetch with new filters
      loadWithFilters(filters);
    },
    [loadWithFilters]
  );

  // Load with URL filters on initial mount (if any)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // If URL has filters, fetch with those filters
      const hasFilters =
        activeFilters.status.length > 0 ||
        activeFilters.assignee.length > 0 ||
        activeFilters.priority.length > 0 ||
        activeFilters.myIssues;
      if (hasFilters) {
        loadWithFilters(activeFilters);
      }
    }
  }, [activeFilters, loadWithFilters]);

  // Reload with filters when currentUserId changes (for myIssues filter)
  const isFirstUserChange = useRef(true);
  useEffect(() => {
    // Skip initial mount
    if (isFirstUserChange.current) {
      isFirstUserChange.current = false;
      return;
    }
    // If myIssues is active, we need to reload when user changes
    if (activeFilters.myIssues) {
      loadWithFilters(activeFilters);
    }
  }, [currentUserId, activeFilters, loadWithFilters]);

  // Group issues by status - server handles filtering via API
  const issuesByStatus = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
        // Only include parent issues (not subtasks)
        if (!issue.parent_id) {
          acc[issue.status] = acc[issue.status] || [];
          acc[issue.status].push(issue);
        }
        return acc;
      },
      { todo: [], in_progress: [], review: [], done: [] }
    );
  }, [issues]);

  const value = {
    issuesByStatus,
    users,
    expandedIssues,
    subtasksCache,
    paginationState,
    handleStatusChange,
    updateIssue: updateIssueWithUndo,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
    loadMoreIssues,
    requestAddSubtask: (issue) => {
      setAutoShowSubtaskForm(true);
      setSelectedIssue(issue);
    },
    // Filter state
    filterPanelExpanded,
    setFilterPanelExpanded,
    activeFilters,
    activeFilterCount,
    handleFiltersChange,
  };

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}
