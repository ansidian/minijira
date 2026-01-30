import { useState, useLayoutEffect } from "react";
import { Avatar, Collapse, Group, Select, MultiSelect } from "@mantine/core";
import { IconCheck, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { formatDate } from "../../../utils/formatters.jsx";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "var(--status-todo)" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "var(--status-progress)",
  },
  { value: "review", label: "Review", color: "var(--status-review)" },
  { value: "done", label: "Done", color: "var(--status-done)" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "var(--priority-low)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "high", label: "High", color: "var(--priority-high)" },
];

function StatusOption({ option }) {
  return (
    <div className="status-option">
      <span className="status-dot" style={{ background: option.color }} />
      <span>{option.label}</span>
    </div>
  );
}

function PriorityOption({ option }) {
  return (
    <div className="priority-option">
      <span className="priority-bar" style={{ background: option.color }} />
      <span>{option.label}</span>
    </div>
  );
}

export function IssueMetaPanel({ issue, users, onStatusChange, onUpdate, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === issue.status);

  // Sync expanded state with viewport size (useLayoutEffect to avoid flash)
  useLayoutEffect(() => {
    if (isMobile === true) {
      setExpanded(false);
    } else if (isMobile === false) {
      setExpanded(true);
    }
  }, [isMobile]);
  const currentPriority = PRIORITY_OPTIONS.find(
    (p) => p.value === issue.priority,
  );
  const assigneeIds = (issue.assignees || []).map(a => a.id.toString());
  const selectedAssignees = (issue.assignees || []);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Status */}
      <div className="meta-field">
        <span className="meta-field-label">Status</span>
        <Select
          value={issue.status}
          onChange={(value) => onStatusChange(issue.id, value)}
          allowDeselect={false}
          data={STATUS_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            color: opt.color,
          }))}
          renderOption={({ option }) => (
            <StatusOption
              option={STATUS_OPTIONS.find((s) => s.value === option.value)}
            />
          )}
          leftSection={
            currentStatus && (
              <span
                className="status-dot"
                style={{ background: currentStatus.color }}
              />
            )
          }
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
            },
          }}
        />
      </div>

      {/* Priority */}
      <div className="meta-field">
        <span className="meta-field-label">Priority</span>
        <Select
          value={issue.priority}
          onChange={(value) => onUpdate(issue.id, { priority: value })}
          allowDeselect={false}
          data={PRIORITY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            color: opt.color,
          }))}
          renderOption={({ option }) => (
            <PriorityOption
              option={PRIORITY_OPTIONS.find((p) => p.value === option.value)}
            />
          )}
          leftSection={
            currentPriority && (
              <span
                className="priority-bar"
                style={{ background: currentPriority.color }}
              />
            )
          }
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
            },
          }}
        />
      </div>

      {/* Assignees */}
      <div className="meta-field">
        <span className="meta-field-label">Assignees</span>
        <MultiSelect
          value={assigneeIds}
          onChange={(values) =>
            onUpdate(issue.id, {
              assignee_ids: values.map(v => parseInt(v)),
            })
          }
          placeholder="Unassigned"
          clearable
          searchable
          hidePickedOptions
          renderOption={({ option, checked }) => (
            <Group gap="xs">
              {checked && (
                <IconCheck size={14} style={{ color: "var(--accent)" }} />
              )}
              <Avatar
                color={users.find(u => u.id.toString() === option.value)?.avatar_color || "gray"}
                name={option.label}
                size={20}
                radius="xl"
              />
              <span>{option.label}</span>
            </Group>
          )}
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
            },
            wrapper: {
              "--input-bg": "transparent",
            },
          }}
        />
      </div>

      {/* Dates - read only */}
      <div className="meta-field">
        <span className="meta-field-label">Created on</span>
        <span className="meta-field-value">{formatDate(issue.created_at)}</span>
        <span className="meta-field-label">Last Updated</span>
        <span className="meta-field-value">{formatDate(issue.updated_at)}</span>
      </div>
    </div>
  );

  // On desktop, render content directly (explicit false, not undefined)
  if (isMobile === false) {
    return content;
  }

  // On mobile, wrap in collapsible
  return (
    <div className="meta-panel-mobile">
      <button
        className="meta-panel-trigger"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="meta-panel-trigger-content">
          {expanded ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
          <span>Details</span>
        </div>
        {!expanded && (
          <div className="meta-panel-summary">
            <span
              className="status-dot"
              style={{ background: currentStatus?.color }}
            />
            <span
              className="priority-bar"
              style={{ background: currentPriority?.color }}
            />
            {selectedAssignees.length > 0 && (
              <Avatar.Group spacing="xs">
                {selectedAssignees.slice(0, 2).map((assignee) => (
                  <Avatar
                    key={assignee.id}
                    color={assignee.avatar_color || "gray"}
                    name={assignee.name}
                    size={18}
                    radius="xl"
                  />
                ))}
                {selectedAssignees.length > 2 && (
                  <Avatar size={18} radius="xl" color="gray">
                    +{selectedAssignees.length - 2}
                  </Avatar>
                )}
              </Avatar.Group>
            )}
          </div>
        )}
      </button>
      <Collapse in={expanded}>{content}</Collapse>
    </div>
  );
}
