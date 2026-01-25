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
  showArchived: false,
  createdRange: [null, null],
  updatedRange: [null, null],
};

// Ensure value is a Date object (handles dayjs objects, strings, etc.)
function ensureDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Handle dayjs objects (have toDate method)
  if (typeof value.toDate === 'function') return value.toDate();
  // Handle ISO strings
  return new Date(value);
}

// Parse filters from URL on initial load
function getFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);

  // Parse date ranges from URL
  const createdFrom = params.get('created_from');
  const createdTo = params.get('created_to');
  const updatedFrom = params.get('updated_from');
  const updatedTo = params.get('updated_to');

  return {
    status: params.getAll('status'),
    assignee: params.getAll('assignee'),
    priority: params.getAll('priority'),
    myIssues: params.get('my') === 'true',
    showArchived: params.get('archived') === 'true',
    createdRange: (createdFrom && createdTo) ? [new Date(createdFrom), new Date(createdTo)] : [null, null],
    updatedRange: (updatedFrom && updatedTo) ? [new Date(updatedFrom), new Date(updatedTo)] : [null, null],
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
      urlFilters.myIssues ||
      urlFilters.showArchived ||
      (urlFilters.createdRange[0] && urlFilters.createdRange[1]) ||
      (urlFilters.updatedRange[0] && urlFilters.updatedRange[1]);
    return hasUrlFilters ? urlFilters : INITIAL_FILTERS;
  });

  const activeFilterCount =
    activeFilters.status.length +
    activeFilters.assignee.length +
    activeFilters.priority.length +
    (activeFilters.myIssues ? 1 : 0) +
    (activeFilters.showArchived ? 1 : 0) +
    (activeFilters.createdRange?.[0] && activeFilters.createdRange?.[1] ? 1 : 0) +
    (activeFilters.updatedRange?.[0] && activeFilters.updatedRange?.[1] ? 1 : 0);

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
      params.delete('archived');
      params.delete('created_from');
      params.delete('created_to');
      params.delete('updated_from');
      params.delete('updated_to');
      // Add new values
      filters.status?.forEach(s => params.append('status', s));
      filters.assignee?.forEach(a => params.append('assignee', a));
      filters.priority?.forEach(p => params.append('priority', p));
      if (filters.myIssues) params.set('my', 'true');
      if (filters.showArchived) params.set('archived', 'true');
      // Add date ranges as ISO strings (ensureDate handles dayjs objects from DatePickerInput)
      if (filters.createdRange?.[0] && filters.createdRange?.[1]) {
        params.set('created_from', ensureDate(filters.createdRange[0]).toISOString());
        params.set('created_to', ensureDate(filters.createdRange[1]).toISOString());
      }
      if (filters.updatedRange?.[0] && filters.updatedRange?.[1]) {
        params.set('updated_from', ensureDate(filters.updatedRange[0]).toISOString());
        params.set('updated_to', ensureDate(filters.updatedRange[1]).toISOString());
      }

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Server-side filtering - fetch with new filters
      loadWithFilters(filters);
    },
    [loadWithFilters]
  );

  // Load on initial mount with URL filters (or empty filters if none)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Always trigger initial load - BoardContext owns this
      loadWithFilters(activeFilters);
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
