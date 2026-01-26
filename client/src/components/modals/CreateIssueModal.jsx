import { useState, useEffect } from "react";
import { Avatar, Badge, Button, Group, Modal, Select, Textarea } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { useMobile } from "../../hooks/useMobile";
import { useMarkdownTextarea } from "../../hooks/useMarkdownTextarea";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMobile = useMobile();
  const { textareaProps: descriptionProps } = useMarkdownTextarea({
    value: description,
    onChange: setDescription,
  });
  const isDirty = title.trim() || description.trim();
  const isSubtask = !!parentIssue;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  // Update status when createStatus prop changes
  useEffect(() => {
    setStatus(createStatus);
  }, [createStatus]);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignee_id: assigneeId || null,
        reporter_id: currentUserId || null,
        parent_id: parentIssue?.id || null,
      });
    } catch {
      // Error handled by parent, just re-enable button
      setIsSubmitting(false);
    }
  }

  // Hotkey for submit (Cmd/Ctrl + Enter)
  useHotkeys([["mod+Enter", () => handleSubmit()]], [], true);

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

  // Build modal title
  const modalTitle = isSubtask ? (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <button className="modal-header-parent" onClick={onClose}>
        <IconArrowLeft size={12} />
        {parentIssue.key}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span className="modal-header-key">New Subtask</span>
        <Badge
          size="xs"
          variant="light"
          color="gray"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginTop: "10px",
          }}
        >
          Subtask
        </Badge>
      </div>
    </div>
  ) : (
    <span className="modal-header-key">New Issue</span>
  );

  const assignee = users.find((u) => u.id.toString() === assigneeId);

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
      title={modalTitle}
      fullScreen={isMobile}
      radius={isMobile ? 0 : undefined}
      transitionProps={{ transition: isMobile ? 'fade' : 'pop', duration: 200 }}
      overlayProps={{ backgroundOpacity: 0.55, blur: isMobile ? 0 : 3 }}
      classNames={{
        content: shake ? "shake" : "",
        body: "modal-body-reset",
      }}
      styles={{
        header: {
          padding: "16px 20px",
          background: isMobile
            ? "var(--bg-secondary)"
            : "linear-gradient(to right, transparent calc(100% - 241px), var(--border-primary) calc(100% - 241px), var(--border-primary) calc(100% - 240px), var(--bg-secondary) calc(100% - 240px))",
        },
        close: {
          marginRight: "4px",
        },
      }}
      size="xl"
      padding={0}
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-two-column modal-two-column--narrow">
          {/* Main content area - left side */}
          <div className="modal-main-content">
            <div className="modal-section">
              <Textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                data-autofocus={!isMobile}
                inputMode="text"
                autosize
                minRows={1}
                styles={{
                  input: {
                    fontSize: "var(--text-lg)",
                    fontWeight: 500,
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                    "&:focus": {
                      borderColor: "var(--accent)",
                    },
                  },
                }}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                data-markdown="full"
                inputMode="text"
                autosize
                minRows={3}
                {...descriptionProps}
                styles={{
                  input: {
                    fontSize: "var(--text-base)",
                    lineHeight: 1.6,
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                    "&:focus": {
                      borderColor: "var(--accent)",
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Sidebar - right side */}
          <div className="modal-sidebar">
            {/* Status */}
            <div className="meta-field">
              <span className="meta-field-label">Status</span>
              <Select
                value={status}
                onChange={(value) => setStatus(value)}
                allowDeselect={false}
                data={STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                renderOption={({ option }) => (
                  <StatusOption
                    option={STATUS_OPTIONS.find(
                      (s) => s.value === option.value
                    )}
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
                value={priority}
                onChange={(value) => setPriority(value)}
                allowDeselect={false}
                data={PRIORITY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                renderOption={({ option }) => (
                  <PriorityOption
                    option={PRIORITY_OPTIONS.find(
                      (p) => p.value === option.value
                    )}
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
                value={assigneeId}
                onChange={(value) => setAssigneeId(value || "")}
                placeholder="Unassigned"
                clearable
                searchable
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
          </div>
        </div>

        {/* Actions - full width at bottom */}
        <div className="create-modal-actions">
          <Group justify="flex-end" gap="sm" style={{ width: "100%" }}>
            {!isDirty || !confirmingCancel ? (
              <>
                <Button
                  variant="subtle"
                  color="gray"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!title.trim() || isSubmitting} loading={isSubmitting}>
                  {isSubtask ? "Create Subtask" : "Create Issue"}
                </Button>
              </>
            ) : (
              <>
                <span
                  style={{
                    marginRight: "auto",
                    color: "var(--text-muted)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Discard changes?
                </span>
                <Button
                  variant="light"
                  color="orange"
                  type="button"
                  onClick={handleConfirmCancel}
                >
                  Discard
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
        </div>
      </form>
    </Modal>
  );
}
