import { Avatar, Badge, Checkbox, Group, Paper, Stack } from "@mantine/core";
import { useIssueContextMenu } from "../../hooks";
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
        withBorder
        className="subtask-card"
        style={{
          cursor: "pointer",
          backgroundColor: "var(--bg-tertiary)",
          borderLeft:
            subtask.status === "done"
              ? "10px solid var(--mantine-color-green-6)"
              : subtask.status === "in_progress"
              ? "6px solid var(--mantine-color-blue-6)"
              : subtask.status === "review"
              ? "8px solid var(--mantine-color-violet-6)"
              : "3px solid var(--mantine-color-gray-6)",
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
                  fontSize: "0.7rem",
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
              fontSize: "0.8rem",
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
                fontSize: "0.7rem",
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
