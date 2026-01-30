import {useContextMenu} from "mantine-contextmenu";

export function useIssueContextMenu({
  issue,
  users,
  isTouchDevice,
  onViewDetails,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
  onRequestAddSubtask,
}) {
  const { showContextMenu } = useContextMenu();
  const isSubtask = !!issue.parent_id;

  return (e) => {
    // Don't show context menu on touch devices (preserve mobile drag & drop)
    if (isTouchDevice) {
      e.preventDefault();
      e.stopPropagation();
      return;

    }
    e.preventDefault();
    e.stopPropagation();

    const menuItems = [
      {
        key: "view",
        title: "View Details",
        onClick: () => onViewDetails(issue),
      },
      {key: "divider-1"},
      {
        key: "status",
        title: "Change Status",
        items: [
          {
            key: "status-todo",
            title: "To Do",
            onClick: () => onStatusChange(issue.id, "todo"),
          },
          {
            key: "status-in_progress",
            title: "In Progress",
            onClick: () => onStatusChange(issue.id, "in_progress"),
          },
          {
            key: "status-review",
            title: "Review",
            onClick: () => onStatusChange(issue.id, "review"),
          },
          {
            key: "status-done",
            title: "Done",
            onClick: () => onStatusChange(issue.id, "done"),
          },
        ],
      },
      {
        key: "priority",
        title: "Change Priority",
        items: [
          {
            key: "priority-low",
            title: "Low",
            onClick: () => onUpdateIssue(issue.id, {priority: "low"}),
          },
          {
            key: "priority-medium",
            title: "Medium",
            onClick: () => onUpdateIssue(issue.id, {priority: "medium"}),
          },
          {
            key: "priority-high",
            title: "High",
            onClick: () => onUpdateIssue(issue.id, {priority: "high"}),
          },
        ],
      },
      {
        key: "assignee",
        title: "Assign To",
        items: [
          {
            key: "assignee-unassigned",
            title: "Unassigned",
            onClick: () => onUpdateIssue(issue.id, {assignee_id: null}),
          },
          {key: "assignee-divider"},
          ...users.map((user) => ({
            key: `assignee-${user.id}`,
            title: user.name,
            onClick: () => onUpdateIssue(issue.id, {assignee_id: user.id}),
          })),
        ],
      },
    ];

    // Add "Add Subtask" option only for parent issues
    if (!isSubtask && onRequestAddSubtask) {
      menuItems.push(
          {key: "divider-2"},
          {
            key: "add-subtask",
            title: "Add Subtask",
            onClick: () => onRequestAddSubtask(issue),
          }
      );
    }

    // Add delete option
    menuItems.push(
        {key: "divider-3"},
        {
          key: "delete",
          title: isSubtask ? "Delete Subtask" : "Delete Issue",
          color: "red",
          onClick: async () => {
            await onDeleteIssue(issue.id);
          },
        }
    );

    showContextMenu(menuItems)(e);
  };
}
