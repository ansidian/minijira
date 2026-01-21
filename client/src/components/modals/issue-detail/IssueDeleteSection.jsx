import { Button, Group } from "@mantine/core";

export function IssueDeleteSection({
  isSubtask,
  confirmingDelete,
  setConfirmingDelete,
  onDelete,
}) {
  return (
    <Group
      justify="flex-start"
      mt="xl"
      pt="md"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {!confirmingDelete ? (
        <Button
          variant="light"
          color="red"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete {isSubtask ? "Subtask" : "Issue"}
        </Button>
      ) : (
        <>
          <span
            style={{
              marginRight: "auto",
              color: "var(--mantine-color-dimmed)",
            }}
          >
            Are you sure?
          </span>
          <Button variant="filled" color="red" onClick={onDelete}>
            Yes, Delete
          </Button>
          <Button variant="default" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </Button>
        </>
      )}
    </Group>
  );
}
