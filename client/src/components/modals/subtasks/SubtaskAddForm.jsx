import { Button, Group, Paper, Select, TextInput } from "@mantine/core";

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
        />
        <Select
          value={priority}
          onChange={(value) => setPriority(value)}
          data={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          size="sm"
          style={{ width: "110px" }}
        />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button size="sm" variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={!title.trim()}>
          Add Subtask
        </Button>
      </Group>
    </Paper>
  );
}
