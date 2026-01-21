import { createContext, useContext, useMemo } from "react";
import { useIssues } from "./IssuesContext";
import { useUsers } from "./UsersContext";
import { useUI } from "./UIContext";

const BoardContext = createContext(null);

export function BoardProvider({ children }) {
  const {
    issues,
    expandedIssues,
    subtasksCache,
    handleStatusChange,
    updateIssue,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
  } = useIssues();
  const { users } = useUsers();
  const { setAutoShowSubtaskForm, setSelectedIssue } = useUI();

  const issuesByStatus = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
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
    handleStatusChange,
    updateIssue,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
    requestAddSubtask: (issue) => {
      setAutoShowSubtaskForm(true);
      setSelectedIssue(issue);
    },
  };

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}
