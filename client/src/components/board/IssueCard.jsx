import { useState } from "react";
import {
  Avatar,
  Badge,
  Collapse,
  Group,
  Paper,
  Stack,
  Tooltip,
} from "@mantine/core";
import { useIssueContextMenu } from "../../hooks/useIssueContextMenu";
import { getPriorityColor } from "../../utils/colors";
import { UnassignedAvatar } from "../shared/UnassignedAvatar";
import { SubtaskCardInline } from "./SubtaskCardInline";

export function IssueCard({
  issue,
  users,
  onClick,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
  onSubtaskChange,
  isExpanded,
  subtasks,
  onToggleSubtasks,
  onRequestAddSubtask,
  isTouchDevice,
}) {
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleContextMenu = useIssueContextMenu({
    issue,
    users,
    isTouchDevice,
    onViewDetails: onClick,
    onStatusChange,
    onUpdateIssue,
    onDeleteIssue,
    onRequestAddSubtask,
  });

  function handleDragStart(e) {
    setDragging(true);
    e.dataTransfer.setData("issueId", issue.id.toString());
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragging(false);
  }

  const hasSubtasks = issue.subtask_count > 0;

  function handleSubtaskBadgeClick(e) {
    e.stopPropagation();
    onToggleSubtasks(issue.id);
  }

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <Paper
        data-issue-card
        className={dragging ? "dragging" : ""}
        onClick={() => onClick(issue)}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        p="md"
        withBorder
        style={{
          cursor: "pointer",
          transition: "all 0.2s ease",
          backgroundColor: hovering ? "var(--bg-hover)" : undefined,
          transform: hovering ? "translateY(-2px)" : undefined,
          boxShadow: hovering ? "0 4px 8px rgba(0, 0, 0, 0.3)" : undefined,
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" gap="xs">
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {issue.key}
            </div>
          </Group>
          <div
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.4,
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {issue.title}
          </div>
          {issue.description && (
            <div
              style={{
                fontSize: "0.75rem",
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {issue.description}
            </div>
          )}
          <Group justify="space-between" mt="xs">
            <Group gap="xs">
              <Badge color={getPriorityColor(issue.priority)} size="sm" variant="light">
                {issue.priority}
              </Badge>
              {/* Subtask progress indicator - now clickable */}
              {hasSubtasks && (
                <Tooltip
                  label={
                    isExpanded
                      ? "Click to collapse subtasks"
                      : `${issue.subtask_done_count} of ${issue.subtask_count} subtasks done - Click to expand`
                  }
                >
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      issue.subtask_done_count === issue.subtask_count
                        ? "green"
                        : "blue"
                    }
                    style={{ cursor: "pointer" }}
                    onClick={handleSubtaskBadgeClick}
                  >
                    {isExpanded ? "▼" : "▶"} {issue.subtask_done_count}/
                    {issue.subtask_count}
                  </Badge>
                </Tooltip>
              )}
            </Group>
            {issue.assignee_name ? (
              <Avatar
                color={issue.assignee_color}
                name={issue.assignee_name}
                size="sm"
                title={issue.assignee_name}
                variant="filled"
              />
            ) : (
              <UnassignedAvatar size="sm" />
            )}
          </Group>
        </Stack>
      </Paper>

      {/* Expanded subtasks */}
      {hasSubtasks && (
        <Collapse in={isExpanded}>
          <div className="subtasks-container">
            {subtasks.map((subtask) => (
              <SubtaskCardInline
                key={subtask.id}
                subtask={subtask}
                users={users}
                isTouchDevice={isTouchDevice}
                onClick={onClick}
                onStatusChange={onStatusChange}
                onUpdateIssue={onUpdateIssue}
                onDeleteIssue={onDeleteIssue}
              />
            ))}
          </div>
        </Collapse>
      )}
    </div>
  );
}
