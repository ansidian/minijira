import { Badge, Button, Group, Progress, Stack } from "@mantine/core";
import { SubtaskRow } from "../../shared/SubtaskRow";

export function SubtaskList({
  subtasks,
  users,
  onStatusToggle,
  onViewIssue,
  onUpdate,
  onDelete,
  isTouchDevice,
}) {
  const doneCount = subtasks.filter((s) => s.status === "done").length;

  return (
    <>
      {subtasks.length > 0 && (
        <Progress
          value={subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0}
          size="sm"
          mb="sm"
          color="green"
          animated={doneCount < subtasks.length}
        />
      )}

      <Stack gap="xs">
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            users={users}
            onStatusToggle={onStatusToggle}
            onClick={() => onViewIssue(subtask.id)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isTouchDevice={isTouchDevice}
          />
        ))}
      </Stack>
    </>
  );
}

export function SubtaskListHeader({ doneCount, totalCount, showAddButton, onAddClick }) {
  return (
    <Group justify="space-between" mb="sm">
      <h3
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        Subtasks
        <Badge size="sm" variant="light" color="gray">
          {doneCount}/{totalCount}
        </Badge>
      </h3>
      {showAddButton && (
        <Button size="xs" variant="subtle" onClick={onAddClick}>
          + Add Subtask
        </Button>
      )}
    </Group>
  );
}
