import { Avatar, Badge, Checkbox, Group, Tooltip } from "@mantine/core";
import { useIssueContextMenu } from "../../hooks";
import { getPriorityColor } from "../../utils/colors";
import { UnassignedAvatar } from "./UnassignedAvatar";

export function SubtaskRow({
  subtask,
  users,
  onStatusToggle,
  onClick,
  onUpdate,
  onDelete,
  isTouchDevice,
}) {
  const handleContextMenu = useIssueContextMenu({
    issue: subtask,
    users,
    isTouchDevice,
    onViewDetails: () => onClick(),
    onStatusChange: onStatusToggle,
    onUpdateIssue: onUpdate,
    onDeleteIssue: onDelete,
    onRequestAddSubtask: null,
  });

  return (
    <Group
      gap="sm"
      p="xs"
      style={{
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
      }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <Checkbox
        checked={subtask.status === "done"}
        onChange={(e) => {
          e.stopPropagation();
          const isDone = e.currentTarget.checked;
          if (isDone) {
            // Checking: mark as done
            onStatusToggle(subtask.id, "done");
          } else {
            // Unchecking: restore to previous status or default to todo
            const newStatus = subtask.previous_status || "todo";
            onStatusToggle(subtask.id, newStatus);
          }
        }}
        size="sm"
        onClick={(e) => e.stopPropagation()}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            marginBottom: "2px",
          }}
        >
          {subtask.key}
        </div>
        <div
          style={{
            textDecoration: subtask.status === "done" ? "line-through" : "none",
            color:
              subtask.status === "done" ? "var(--text-secondary)" : "inherit",
            fontSize: "0.875rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtask.title}
        </div>
        {subtask.description && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: "4px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtask.description}
          </div>
        )}
      </div>
      <Badge
        size="xs"
        variant="light"
        color={getPriorityColor(subtask.priority)}
      >
        {subtask.priority}
      </Badge>
      {subtask.assignee_name ? (
        <Tooltip label={subtask.assignee_name}>
          <Avatar
            color={subtask.assignee_color}
            name={subtask.assignee_name}
            size="sm"
          />
        </Tooltip>
      ) : (
        <UnassignedAvatar size="sm" />
      )}
    </Group>
  );
}
