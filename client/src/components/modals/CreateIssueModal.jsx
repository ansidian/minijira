import { useState } from "react";
import { Button, Group, Modal, Select, Textarea, TextInput } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";

export function CreateIssueModal({
  users,
  currentUserId,
  createStatus,
  onClose,
  onCreate,
  parentIssue = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(createStatus);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [shake, setShake] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [flashStatus, setFlashStatus] = useState(true);

  const isDirty = title.trim() || description.trim();
  const isSubtask = !!parentIssue;

  function handleSubmit(e) {
    e?.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee_id: assigneeId || null,
      reporter_id: currentUserId || null,
      parent_id: parentIssue?.id || null,
    });
  }

  // Hotkey for submit (Cmd/Ctrl + Enter)
  useHotkeys([["mod+Enter", () => handleSubmit()]], [], true);

  function handleOverlayClick() {
    if (isDirty) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      onClose();
    }
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmingCancel(true);
    } else {
      onClose();
    }
  }

  function handleConfirmCancel() {
    setConfirmingCancel(false);
    onClose();
  }

  return (
    <Modal
      opened={true}
      onClose={() => {
        if (isDirty) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        } else {
          onClose();
        }
      }}
      withCloseButton={true}
      title={
        isSubtask ? `Create Subtask for ${parentIssue.key}` : "Create Issue"
      }
      classNames={{ content: shake ? "shake" : "" }}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          data-autofocus
          mb="md"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          autosize
          minRows={2}
          mb="md"
        />
        <Group grow mb="md">
          <Select
            label="Status"
            value={status}
            onChange={(value) => setStatus(value)}
            data={[
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "review", label: "Review" },
              { value: "done", label: "Done" },
            ]}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(value) => setPriority(value)}
            data={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </Group>

        <Select
          label="Assignee"
          value={assigneeId}
          onChange={(value) => setAssigneeId(value || "")}
          placeholder="Unassigned"
          clearable
          searchable
          selectFirstOptionOnChange
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
          mb="md"
        />
        <Group justify="flex-end" mt="xl">
          {!isDirty || !confirmingCancel ? (
            <>
              <Button variant="default" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {isSubtask ? "Create Subtask" : "Create Issue"}
              </Button>
            </>
          ) : (
            <>
              <span
                style={{ marginRight: "auto", color: "var(--text-secondary)" }}
              >
                Discard changes?
              </span>
              <Button
                variant="light"
                color="orange"
                type="button"
                onClick={handleConfirmCancel}
              >
                Yes, Discard
              </Button>
              <Button
                variant="filled"
                type="button"
                onClick={() => setConfirmingCancel(false)}
              >
                Keep Editing
              </Button>
            </>
          )}
        </Group>
      </form>
    </Modal>
  );
}
