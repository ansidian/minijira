import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { api } from "../../utils/api";
import { notifyApiError, notifyError, notifyUndo } from "../../utils/notify";
import { SubtaskRow } from "../shared/SubtaskRow";

export function SubtasksSection({
  parentIssue,
  users,
  currentUserId,
  onViewIssue,
  onSubtaskChange,
  autoShowSubtaskForm,
  onSubtaskFormShown,
  isTouchDevice,
}) {
  const [subtasks, setSubtasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [loading, setLoading] = useState(true);
  const pendingDeletesRef = useRef(new Map());

  useEffect(() => {
    loadSubtasks();
  }, [parentIssue.id]);

  // Auto-show the form when requested via context menu
  useEffect(() => {
    if (autoShowSubtaskForm && !showAddForm) {
      setShowAddForm(true);
      onSubtaskFormShown?.();
    }
  }, [autoShowSubtaskForm, showAddForm, onSubtaskFormShown]);

  async function loadSubtasks() {
    setLoading(true);
    const data = await api.get(`/issues/${parentIssue.id}/subtasks`);
    setSubtasks(data);
    setLoading(false);
  }

  async function handleCreateSubtask() {
    if (!newTitle.trim()) return;

    const newSubtask = await api.post("/issues", {
      title: newTitle.trim(),
      parent_id: parentIssue.id,
      status: "todo",
      priority: newPriority,
      assignee_id: newAssignee || null,
      reporter_id: currentUserId,
    });

    setSubtasks([...subtasks, newSubtask]);
    setNewTitle("");
    setNewAssignee("");
    setNewPriority("medium");
    setShowAddForm(false);
    onSubtaskChange?.(parentIssue.id); // Pass parent ID to expand it
  }

  // Hotkey for creating subtask when form is open (Cmd/Ctrl + Enter)
  useHotkeys(
    [
      [
        "mod+Enter",
        () => {
          if (showAddForm && newTitle.trim()) {
            handleCreateSubtask();
          }
        },
      ],
    ],
    [],
    true
  );

  async function handleStatusToggle(subtaskId, newStatus) {
    const currentSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
    if (!currentSubtask || currentSubtask.status === newStatus) return;

    try {
      const updated = await api.patch(`/issues/${subtaskId}`, {
        status: newStatus,
        user_id: currentUserId,
      });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s))
      );
      onSubtaskChange?.();
    } catch (error) {
      notifyApiError({
        error,
        operation: "update subtask status"
      });
    }
  }

  async function handleUpdate(subtaskId, data) {
    const currentSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
    if (!currentSubtask) return;
    try {
      const updated = await api.patch(`/issues/${subtaskId}`, {
        ...data,
        user_id: currentUserId,
      });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s))
      );
      onSubtaskChange?.();
    } catch (error) {
      notifyApiError({
        error,
        operation: "update subtask"
      });
    }
  }

  async function handleDelete(subtaskId) {
    const currentSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
    if (!currentSubtask) return;

    const existingPending = pendingDeletesRef.current.get(subtaskId);
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
      pendingDeletesRef.current.delete(subtaskId);
    }

    const snapshot = {
      subtasks: [...subtasks],
    };

    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

    const timeoutId = setTimeout(async () => {
      try {
        await api.delete(`/issues/${subtaskId}`, { user_id: currentUserId });
        onSubtaskChange?.();
      } catch (error) {
        setSubtasks(snapshot.subtasks);
        notifyError("Failed to delete subtask.");
      } finally {
        pendingDeletesRef.current.delete(subtaskId);
      }
    }, 7000);

    pendingDeletesRef.current.set(subtaskId, { timeoutId, snapshot });

    notifyUndo({
      title: "Subtask deleted",
      message: `Deleted "${currentSubtask.title}".`,
      onUndo: () => {
        const pending = pendingDeletesRef.current.get(subtaskId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingDeletesRef.current.delete(subtaskId);
        setSubtasks(pending.snapshot.subtasks);
      },
    });
  }

  const doneCount = subtasks.filter((s) => s.status === "done").length;

  if (loading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <div>
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
            {doneCount}/{subtasks.length}
          </Badge>
        </h3>
        {!showAddForm && (
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setShowAddForm(true)}
          >
            + Add Subtask
          </Button>
        )}
      </Group>

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
            onStatusToggle={handleStatusToggle}
            onClick={() => onViewIssue(subtask.id)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            isTouchDevice={isTouchDevice}
          />
        ))}
      </Stack>

      {subtasks.length === 0 && !showAddForm && (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: "4px",
          }}
        >
          No subtasks yet. Click "+ Add Subtask" to break this issue down.
        </div>
      )}

      {showAddForm && (
        <Paper p="sm" mt="sm" withBorder>
          <TextInput
            placeholder="Subtask title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter" &&
                newTitle.trim()
              ) {
                handleCreateSubtask();
              } else if (e.key === "Escape") {
                setShowAddForm(false);
                setNewTitle("");
              }
            }}
            mb="sm"
            autoFocus
          />
          <Group gap="sm">
            <Select
              placeholder="Assignee"
              value={newAssignee}
              onChange={(value) => setNewAssignee(value || "")}
              data={users.map((u) => ({
                value: u.id.toString(),
                label: u.name,
              }))}
              clearable
              searchable
              selectFirstOptionOnChange
              size="sm"
              style={{ flex: 1 }}
            />
            <Select
              value={newPriority}
              onChange={(value) => setNewPriority(value)}
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
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
                setNewAssignee("");
                setNewPriority("medium");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubtask}
              disabled={!newTitle.trim()}
            >
              Add Subtask
            </Button>
          </Group>
        </Paper>
      )}
    </div>
  );
}
