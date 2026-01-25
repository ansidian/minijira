import { Button, Group, Paper, Select, TextInput } from "@mantine/core";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "var(--priority-low)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "high", label: "High", color: "var(--priority-high)" },
];

function PriorityOption({ option }) {
  return (
    <div className="priority-option">
      <span className="priority-bar" style={{ background: option.color }} />
      <span>{option.label}</span>
    </div>
  );
}

export function SubtaskAddForm({
  title,
  setTitle,
  assignee,
  setAssignee,
  priority,
  setPriority,
  users,
  onSubmit,
  onCancel,
}) {
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  return (
    <Paper p="sm" mt="sm" withBorder>
      <TextInput
        placeholder="Subtask title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && title.trim()) {
            onSubmit();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        mb="sm"
        autoFocus
        styles={{
          input: {
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)",
            fontSize: "var(--text-sm)",
          },
        }}
      />
      <Group gap="sm">
        <Select
          placeholder="Assignee"
          value={assignee}
          onChange={(value) => setAssignee(value || "")}
          data={users.map((u) => ({ value: u.id.toString(), label: u.name }))}
          clearable
          searchable
          selectFirstOptionOnChange
          size="sm"
          style={{ flex: 1 }}
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
            },
          }}
        />
        <Select
          value={priority}
          onChange={(value) => setPriority(value)}
          data={PRIORITY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
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
          size="sm"
          style={{ width: "120px" }}
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
            },
          }}
        />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button size="sm" variant="subtle" color="gray" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={!title.trim()}>
          Add Subtask
        </Button>
      </Group>
    </Paper>
  );
}
