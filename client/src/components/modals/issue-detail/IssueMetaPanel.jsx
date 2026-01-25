import { Avatar, Group, Select } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
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

export function IssueMetaPanel({ issue, users, onStatusChange, onUpdate }) {
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === issue.status);
  const currentPriority = PRIORITY_OPTIONS.find(
    (p) => p.value === issue.priority,
  );
  const assignee = users.find((u) => u.id === issue.assignee_id);

  return (
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

      {/* Assignee */}
      <div className="meta-field">
        <span className="meta-field-label">Assignee</span>
        <Select
          value={issue.assignee_id?.toString() || null}
          onChange={(value) =>
            onUpdate(issue.id, {
              assignee_id: value ? parseInt(value) : null,
            })
          }
          placeholder="Unassigned"
          clearable
          searchable
          renderOption={({ option }) => (
            <Group gap="xs">
              {option.value === issue.assignee_id?.toString() && (
                <IconCheck size={14} style={{ color: "var(--accent)" }} />
              )}
              <span>{option.label}</span>
            </Group>
          )}
          leftSection={
            assignee ? (
              <Avatar
                color={assignee.color || "gray"}
                name={assignee.name}
                size={20}
                radius="xl"
              />
            ) : null
          }
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
              paddingLeft: assignee ? "36px" : undefined,
            },
            wrapper: {
              "--input-bg": "transparent",
            },
          }}
        />
      </div>

      {/* Created date - read only */}
      <div className="meta-field">
        <span className="meta-field-label">Created</span>
        <span className="meta-field-value">{formatDate(issue.created_at)}</span>
      </div>
    </div>
  );
}
