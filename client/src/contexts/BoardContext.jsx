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

  // Filter panel state
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);

  const activeFilterCount =
    activeFilters.status.length +
    activeFilters.assignee.length +
    activeFilters.priority.length +
    (activeFilters.myIssues ? 1 : 0);

  // Handle filter changes - trigger server-side fetch
  const handleFiltersChange = useCallback(
    (filters) => {
      setActiveFilters(filters);
      // Server-side filtering - fetch with new filters
      loadWithFilters(filters);
    },
    [loadWithFilters]
  );

  // Reload with filters when currentUserId changes (for myIssues filter)
  useEffect(() => {
    // Skip initial mount - IssuesContext handles that
    if (isInitialMount.current) {
      isInitialMount.current = false;
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
