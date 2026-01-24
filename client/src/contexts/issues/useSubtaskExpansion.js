import { useEffect, useRef } from "react";

export function useSubtaskExpansion({ state, dispatch, cacheManager }) {
  const hasAutoExpanded = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const toggleSubtasks = async (issueId) => {
    const expandedIssues = new Set(stateRef.current.expandedIssues);

    if (expandedIssues.has(issueId)) {
      expandedIssues.delete(issueId);
    } else {
      expandedIssues.add(issueId);
      if (!cacheManager.getCached(issueId)) {
        const subtasks = await cacheManager.fetchSubtasksForParent(issueId);
        cacheManager.mergeCached({ [issueId]: subtasks });
      }
    }

    dispatch({ type: "SET_EXPANDED_ISSUES", value: expandedIssues });
  };

  const toggleAllSubtasks = async () => {
    const parentsWithSubtasks = stateRef.current.issues.filter(
      (i) => !i.parent_id && i.subtask_count > 0,
    );

    const allExpanded = parentsWithSubtasks.every((i) =>
      stateRef.current.expandedIssues.has(i.id),
    );

    if (allExpanded) {
      dispatch({ type: "SET_EXPANDED_ISSUES", value: new Set() });
      return;
    }

    const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
    const missingParents = parentsWithSubtasks.filter(
      (issue) => !cacheManager.getCached(issue.id),
    );

    if (missingParents.length > 0) {
      const results = await Promise.all(
        missingParents.map(async (issue) => {
          const subtasks = await cacheManager.fetchSubtasksForParent(issue.id);
          return { issueId: issue.id, subtasks };
        }),
      );
      const updates = {};
      for (const { issueId, subtasks } of results) {
        updates[issueId] = subtasks;
      }
      cacheManager.mergeCached(updates);
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
        (i) => !i.parent_id && i.subtask_count > 0 && i.status !== "done",
      );
      if (parentsWithSubtasks.length > 0) {
        hasAutoExpanded.current = true;
        const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
        dispatch({ type: "SET_EXPANDED_ISSUES", value: newExpanded });

        const fetchAllSubtasks = async () => {
          const results = await Promise.all(
            parentsWithSubtasks.map(async (issue) => {
              const subtasks = await cacheManager.fetchSubtasksForParent(issue.id);
              return { issueId: issue.id, subtasks };
            }),
          );
          const updates = {};
          for (const { issueId, subtasks } of results) {
            updates[issueId] = subtasks;
          }
          cacheManager.mergeCached(updates);
        };

        fetchAllSubtasks();
      }
    }
  }, [state.issues, state.expandedIssues.size]);

  return { toggleSubtasks, toggleAllSubtasks };
}
