import { Avatar, Badge, Checkbox, Group, Tooltip } from "@mantine/core";
import { useIssueContextMenu } from "../../hooks/useIssueContextMenu";
import { getPriorityColor } from "../../utils/colors";
import { UnassignedAvatar } from "./UnassignedAvatar";
import { TitleWithLinks } from "./TitleWithLinks";

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
      className="subtask-row"
      gap="sm"
      p="xs"
      data-pending={subtask._isPending ? "true" : undefined}
      data-failing={subtask._isFailing ? "true" : undefined}
      style={{
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: "var(--radius-sm)",
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
          className={subtask.key ? undefined : "issue-key-pending"}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            marginBottom: "2px",
          }}
        >
          {subtask.key || "..."}
        </div>
        <div
          style={{
            textDecoration: subtask.status === "done" ? "line-through" : "none",
            color:
              subtask.status === "done" ? "var(--text-secondary)" : "inherit",
            fontSize: "var(--text-base)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <TitleWithLinks>{subtask.title}</TitleWithLinks>
        </div>
        {subtask.description && (
          <div
            style={{
              fontSize: "var(--text-sm)",
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
      {subtask.assignees && subtask.assignees.length > 0 ? (
        <Avatar.Group spacing="xs">
          {subtask.assignees.slice(0, 3).map((assignee) => (
            <Tooltip key={assignee.id} label={assignee.name}>
              <Avatar
                color={assignee.avatar_color}
                name={assignee.name}
                size="sm"
              />
            </Tooltip>
          ))}
          {subtask.assignees.length > 3 && (
            <Avatar size="sm" variant="filled" color="gray">
              +{subtask.assignees.length - 3}
            </Avatar>
          )}
        </Avatar.Group>
      ) : (
        <UnassignedAvatar size="sm" />
      )}
    </Group>
  );
}
