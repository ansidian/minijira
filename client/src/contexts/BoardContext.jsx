import { useMemo } from "react";
import { useIssues } from "./hooks/useIssues";
import { useUsers } from "./UsersContext";
import { useUI } from "./UIContext";
import { BoardContext } from "./BoardContextBase";

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
      { todo: [], in_progress: [], review: [], done: [] },
    );
  }, [issues]);

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
  };

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}
