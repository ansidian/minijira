import { useMemo, useState, useCallback } from "react";
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
    handleStatusChange,
    updateIssue,
    updateIssueWithUndo,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
  } = useIssues();
  const { users, currentUserId } = useUsers();
  const { setAutoShowSubtaskForm, setSelectedIssue } = useUI();

  // Filter panel state
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);

  const activeFilterCount =
    activeFilters.status.length +
    activeFilters.assignee.length +
    activeFilters.priority.length +
    (activeFilters.myIssues ? 1 : 0);

  // Memoized callback for filter changes from FilterPanel
  const handleFiltersChange = useCallback((filters) => {
    setActiveFilters(filters);
  }, []);

  // Apply client-side filtering (temporary until Plan 04 server-side)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Only filter parent issues (subtasks handled separately)
      if (issue.parent_id) return true;

      // Status filter (OR within)
      if (
        activeFilters.status.length > 0 &&
        !activeFilters.status.includes(issue.status)
      ) {
        return false;
      }

      // Priority filter (OR within)
      if (
        activeFilters.priority.length > 0 &&
        !activeFilters.priority.includes(issue.priority)
      ) {
        return false;
      }

      // Assignee filter (OR within)
      if (activeFilters.assignee.length > 0) {
        const assigneeStr = issue.assignee_id ? String(issue.assignee_id) : "0";
        if (!activeFilters.assignee.includes(assigneeStr)) {
          return false;
        }
      }

      // My Issues filter
      if (activeFilters.myIssues && issue.assignee_id !== currentUserId) {
        return false;
      }

      return true;
    });
  }, [issues, activeFilters, currentUserId]);

  const issuesByStatus = useMemo(() => {
    return filteredIssues.reduce(
      (acc, issue) => {
        if (!issue.parent_id) {
          acc[issue.status] = acc[issue.status] || [];
          acc[issue.status].push(issue);
        }
        return acc;
      },
      { todo: [], in_progress: [], review: [], done: [] },
    );
  }, [filteredIssues]);

  const value = {
    issuesByStatus,
    users,
    expandedIssues,
    subtasksCache,
    handleStatusChange,
    updateIssue: updateIssueWithUndo,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
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
