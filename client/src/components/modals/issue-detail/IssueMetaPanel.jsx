import { Group, Select, TextInput } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { formatDate } from "../../../utils/formatters.jsx";

export function IssueMetaPanel({ issue, users, onStatusChange, onUpdate }) {
  return (
    <>
      <Group grow mb="md">
        <Select
          label="Status"
          value={issue.status}
          onChange={(value) => onStatusChange(issue.id, value)}
          allowDeselect={false}
          data={[
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "review", label: "Review" },
            { value: "done", label: "Done" },
          ]}
        />
        <Select
          label="Priority"
          value={issue.priority}
          onChange={(value) => onUpdate(issue.id, { priority: value })}
          allowDeselect={false}
          data={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </Group>

      <Group grow mb="md">
        <Select
          label="Assignee"
          value={issue.assignee_id?.toString() || null}
          onChange={(value) =>
            onUpdate(issue.id, {
              assignee_id: value ? parseInt(value) : null,
            })
          }
          placeholder="Unassigned"
          clearable
          searchable
          selectFirstOptionOnChange
          autoSelectOnBlur
          onFocus={(event) => event.currentTarget.select()}
          renderOption={({ option }) => (
            <Group gap="xs">
              {option.value === issue.assignee_id?.toString() && (
                <IconCheck size={16} />
              )}
              <span>{option.label}</span>
            </Group>
          )}
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
        />
        <TextInput
          label="Created"
          value={formatDate(issue.created_at)}
          readOnly
          variant="filled"
          styles={{
            input: { cursor: "default" },
          }}
        />
      </Group>
    </>
  );
}
