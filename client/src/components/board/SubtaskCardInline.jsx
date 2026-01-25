import { Avatar, Badge, Checkbox, Group, Paper, Stack } from "@mantine/core";
import { useIssueContextMenu } from "../../hooks/useIssueContextMenu";
import { getPriorityColor, getStatusColor } from "../../utils/colors";
import { UnassignedAvatar } from "../shared/UnassignedAvatar";

export function SubtaskCardInline({
  subtask,
  users,
  isTouchDevice,
  onClick,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
}) {
  const handleContextMenu = useIssueContextMenu({
    issue: subtask,
    users,
    isTouchDevice,
    onViewDetails: onClick,
    onStatusChange,
    onUpdateIssue,
    onDeleteIssue,
    onRequestAddSubtask: null, // Subtasks can't have subtasks
  });

  const handleCheckboxToggle = async (e) => {
    e.stopPropagation();
    const isDone = subtask.status === "done";

    if (isDone) {
      // Unchecking: restore to previous status or default to todo
      const newStatus = subtask.previous_status || "todo";
      await onUpdateIssue(subtask.id, { status: newStatus });
    } else {
      // Checking: mark as done
      await onUpdateIssue(subtask.id, { status: "done" });
    }
  };

  return (
    <div className="subtask-item">
      <div className="subtask-connector" />
      <Paper
        p="sm"
        className="subtask-card"
        data-archived={subtask.archived_at ? "true" : undefined}
        style={{
          cursor: "pointer",
          backgroundColor: "var(--bg-tertiary)",
          boxShadow: "var(--shadow-sm)",
          borderLeft:
            subtask.status === "done"
              ? "3px solid var(--status-done)"
              : subtask.status === "in_progress"
              ? "3px solid var(--status-progress)"
              : subtask.status === "review"
              ? "3px solid var(--status-review)"
              : "3px solid var(--status-todo)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(subtask);
        }}
        onContextMenu={handleContextMenu}
      >
        <Stack gap="xs">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Checkbox
                checked={subtask.status === "done"}
                onChange={handleCheckboxToggle}
                onClick={(e) => e.stopPropagation()}
                size="sm"
                styles={{ input: { cursor: "pointer" } }}
              />
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {subtask.key}
              </div>
            </Group>
            <Badge size="xs" variant="dot" color={getStatusColor(subtask.status)}>
              {subtask.status === "done"
                ? "Done"
                : subtask.status === "in_progress"
                ? "In Progress"
                : subtask.status === "review"
                ? "Review"
                : "To Do"}
            </Badge>
          </Group>
          <div
            style={{
              fontSize: "var(--text-md)",
              lineHeight: 1.3,
              textDecoration:
                subtask.status === "done" ? "line-through" : "none",
              opacity: subtask.status === "done" ? 0.7 : 1,
            }}
          >
            {subtask.title}
          </div>
          {subtask.description && (
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {subtask.description}
            </div>
          )}
          <Group justify="space-between" gap="xs">
            <Badge
              color={getPriorityColor(subtask.priority)}
              size="xs"
              variant="light"
            >
              {subtask.priority}
            </Badge>
            {subtask.assignee_name ? (
              <Avatar
                color={subtask.assignee_color}
                name={subtask.assignee_name}
                size="sm"
                title={subtask.assignee_name}
              />
            ) : (
              <UnassignedAvatar size="sm" />
            )}
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}
