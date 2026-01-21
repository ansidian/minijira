import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { api } from "../../utils/api";
import { formatDate, linkifyText } from "../../utils/formatters.jsx";
import { SubtasksSection } from "./SubtasksSection";

export function IssueDetailModal({
  issue,
  users,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onViewIssue,
  onSubtaskChange,
  autoShowSubtaskForm,
  onSubtaskFormShown,
  isTouchDevice,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || "");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [shake, setShake] = useState(false);
  const [fieldToFocus, setFieldToFocus] = useState(null);

  const isEditDirty =
    editing &&
    (title !== issue.title || description !== (issue.description || ""));

  const isSubtask = !!issue.parent_id;

  // Reset state when issue changes (for subtask navigation)
  useEffect(() => {
    setTitle(issue.title);
    setDescription(issue.description || "");
    setEditing(false);
    setConfirmingDelete(false);
    setConfirmingCancel(false);
  }, [issue.id]);

  useEffect(() => {
    loadComments();
  }, [issue.id]);

  // Focus the appropriate field when entering edit mode
  useEffect(() => {
    if (editing && fieldToFocus) {
      const focusTextarea = () => {
        const modal = document.querySelector(".mantine-Modal-content");
        if (modal) {
          const textareas = modal.querySelectorAll("textarea");
          const textarea =
            fieldToFocus === "title" ? textareas[0] : textareas[1];
          if (textarea) {
            textarea.focus();
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
            return true;
          }
        }
        return false;
      };

      if (!focusTextarea()) {
        requestAnimationFrame(() => {
          if (!focusTextarea()) {
            requestAnimationFrame(() => {
              focusTextarea();
            });
          }
        });
      }

      setFieldToFocus(null);
    }
  }, [editing, fieldToFocus]);

  async function loadComments() {
    const data = await api.get(`/issues/${issue.id}/comments`);
    setComments(data);
  }

  async function handleSave() {
    if (!editing) return;
    await onUpdate(issue.id, { title, description });
    setEditing(false);
    notifications.show({
      title: "Issue updated",
      message: "Your changes have been saved",
      color: "green",
    });
  }

  // Hotkey for save/send (Cmd/Ctrl + Enter)
  useHotkeys(
    [
      [
        "mod+Enter",
        () => {
          if (editing) {
            handleSave();
          } else if (newComment.trim()) {
            handleAddComment();
          }
        },
      ],
    ],
    [],
    true
  );

  async function handleAddComment() {
    if (!newComment.trim()) return;
    await api.post(`/issues/${issue.id}/comments`, {
      body: newComment.trim(),
      user_id: currentUserId || null,
    });
    setNewComment("");
    loadComments();
  }

  function handleOverlayClick() {
    if (isEditDirty) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      onClose();
    }
  }

  function handleCancelEdit() {
    setTitle(issue.title);
    setDescription(issue.description || "");
    setEditing(false);
    setConfirmingCancel(false);
  }

  return (
    <Modal
      opened={true}
      onClose={() => {
        if (isEditDirty) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        } else {
          onClose();
        }
      }}
      title={
        <Group gap="xs">
          {issue.key}
          {isSubtask && (
            <Badge size="sm" variant="light" color="blue">
              Subtask
            </Badge>
          )}
        </Group>
      }
      withCloseButton={true}
      classNames={{ content: shake ? "shake" : "" }}
      size="lg"
    >
      {/* Parent issue link for subtasks */}
      {isSubtask && issue.parent_key && (
        <Button
          variant="subtle"
          size="xs"
          mb="md"
          onClick={() => onViewIssue(issue.parent_id)}
          style={{ marginLeft: "-0.5rem" }}
        >
          ← Back to {issue.parent_key}
        </Button>
      )}

      {editing ? (
        // Editing mode - editable inputs
        <>
          <Textarea
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            autosize
            minRows={1}
            mb="md"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            autosize
            minRows={2}
            mb="md"
          />
          <Group justify="flex-end" mb="xl">
            {!isEditDirty || !confirmingCancel ? (
              <>
                <Button
                  variant="default"
                  onClick={() => {
                    if (isEditDirty) {
                      setConfirmingCancel(true);
                    } else {
                      handleCancelEdit();
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button variant="filled" onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <span
                  style={{
                    marginRight: "auto",
                    color: "var(--text-secondary)",
                  }}
                >
                  Discard changes?
                </span>
                <Button
                  variant="light"
                  color="orange"
                  onClick={handleCancelEdit}
                >
                  Yes, Discard
                </Button>
                <Button
                  variant="filled"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep Editing
                </Button>
              </>
            )}
          </Group>
        </>
      ) : (
        // View mode - show as text with clickable links
        <>
          <div
            style={{
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={() => {
              setFieldToFocus("title");
              setEditing(true);
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Title
            </div>
            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "4px",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {issue.title}
            </div>
          </div>
          <div
            style={{
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={(e) => {
              if (e.target.tagName !== "A") {
                setFieldToFocus("description");
                setEditing(true);
              }
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Description
            </div>
            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "4px",
                minHeight: "60px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                color: issue.description ? "inherit" : "var(--text-muted)",
              }}
            >
              {issue.description
                ? linkifyText(issue.description).map((part, index) =>
                    part.type === "link" ? (
                      <a
                        key={index}
                        href={part.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="comment-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {part.content}
                      </a>
                    ) : (
                      <span key={index}>{part.content}</span>
                    )
                  )
                : "Click to add a description..."}
            </div>
          </div>
        </>
      )}

      {/* Meta fields - using same layout as CreateIssueModal */}
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

      {/* Subtasks Section - only show for parent issues */}
      {!isSubtask && (
        <div
          style={{
            marginTop: "1.5rem",
            marginBottom: "1.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          <SubtasksSection
            parentIssue={issue}
            users={users}
            currentUserId={currentUserId}
            onViewIssue={onViewIssue}
            onSubtaskChange={onSubtaskChange}
            autoShowSubtaskForm={autoShowSubtaskForm}
            onSubtaskFormShown={onSubtaskFormShown}
            isTouchDevice={isTouchDevice}
          />
        </div>
      )}

      {/* Comments */}
      <h3
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
        }}
      >
        Comments ({comments.length})
      </h3>

      <Stack gap="sm">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <Avatar
                color={comment.user_color || "gray"}
                name={comment.user_name || "Anonymous"}
                size="sm"
              />
              <span className="comment-author">
                {comment.user_name || "Anonymous"}
              </span>
              <span className="comment-time">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <div className="comment-body">
              {linkifyText(comment.body).map((part, index) =>
                part.type === "link" ? (
                  <a
                    key={index}
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="comment-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part.content}
                  </a>
                ) : (
                  <span key={index}>{part.content}</span>
                )
              )}
            </div>
          </div>
        ))}
      </Stack>

      {/* Comment form */}
      <Group gap="sm" mt="md" align="flex-start">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              handleAddComment();
            }
          }}
          autosize
          minRows={1}
          style={{ flex: 1 }}
        />
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
          Send
        </Button>
      </Group>

      {/* Delete button */}
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
            <Button variant="filled" color="red" onClick={() => onDelete(issue.id)}>
              Yes, Delete
            </Button>
            <Button variant="default" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </>
        )}
      </Group>
    </Modal>
  );
}
