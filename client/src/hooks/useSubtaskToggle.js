import { useMemo } from "react";
import { useIssues } from "../contexts/IssuesContext";

export function useSubtaskToggle() {
  const { issues, expandedIssues, toggleAllSubtasks } = useIssues();

  const parentsWithSubtasks = useMemo(
    () => issues.filter((issue) => !issue.parent_id && issue.subtask_count > 0),
    [issues]
  );

  const allExpanded = useMemo(
    () => parentsWithSubtasks.every((issue) => expandedIssues.has(issue.id)),
    [parentsWithSubtasks, expandedIssues]
  );

  return {
    allExpanded,
    toggleAllSubtasks,
  };
}
