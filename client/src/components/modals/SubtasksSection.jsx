import { useEffect, useState } from "react";
import { Center, Loader } from "@mantine/core";
import { api } from "../../utils/api";
import { notifyApiError } from "../../utils/notify";
import { useSubtaskForm } from "../../hooks/useSubtaskForm";
import { useSubtaskDelete } from "../../hooks/useSubtaskDelete";
import { SubtaskAddForm } from "./subtasks/SubtaskAddForm";
import { SubtaskList, SubtaskListHeader } from "./subtasks/SubtaskList";

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
  const [loading, setLoading] = useState(true);

  const {
    showForm, setShowForm,
    title, setTitle,
    assignee, setAssignee,
    priority, setPriority,
    handleSubmit, resetForm,
  } = useSubtaskForm({
    parentIssue,
    currentUserId,
    onSubtaskCreated: (newSubtask) => setSubtasks([...subtasks, newSubtask]),
    onSubtaskChange,
  });

  const { handleDelete } = useSubtaskDelete({
    currentUserId,
    onSubtaskChange,
    setSubtasks,
  });

  useEffect(() => {
    loadSubtasks();
  }, [parentIssue.id]);

  useEffect(() => {
    if (autoShowSubtaskForm && !showForm) {
      setShowForm(true);
      onSubtaskFormShown?.();
    }
  }, [autoShowSubtaskForm, showForm, onSubtaskFormShown, setShowForm]);

  async function loadSubtasks() {
    setLoading(true);
    const data = await api.get(`/issues/${parentIssue.id}/subtasks`);
    setSubtasks(data);
    setLoading(false);
  }

  async function handleStatusToggle(subtaskId, newStatus) {
    const currentSubtask = subtasks.find((s) => s.id === subtaskId);
    if (!currentSubtask || currentSubtask.status === newStatus) return;
    try {
      const updated = await api.patch(`/issues/${subtaskId}`, {
        status: newStatus,
        user_id: currentUserId,
      });
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)));
      onSubtaskChange?.();
    } catch (error) {
      notifyApiError({ error, operation: "update subtask status" });
    }
  }

  async function handleUpdate(subtaskId, data) {
    const currentSubtask = subtasks.find((s) => s.id === subtaskId);
    if (!currentSubtask) return;
    try {
      const updated = await api.patch(`/issues/${subtaskId}`, { ...data, user_id: currentUserId });
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)));
      onSubtaskChange?.();
    } catch (error) {
      notifyApiError({ error, operation: "update subtask" });
    }
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
      <SubtaskListHeader
        doneCount={doneCount}
        totalCount={subtasks.length}
        showAddButton={!showForm}
        onAddClick={() => setShowForm(true)}
      />

      <SubtaskList
        subtasks={subtasks}
        users={users}
        onStatusToggle={handleStatusToggle}
        onViewIssue={onViewIssue}
        onUpdate={handleUpdate}
        onDelete={(subtaskId) => {
          const subtask = subtasks.find((s) => s.id === subtaskId);
          handleDelete(subtaskId, subtask?.title || "", subtasks);
        }}
        isTouchDevice={isTouchDevice}
      />

      {subtasks.length === 0 && !showForm && (
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

      {showForm && (
        <SubtaskAddForm
          title={title}
          setTitle={setTitle}
          assignee={assignee}
          setAssignee={setAssignee}
          priority={priority}
          setPriority={setPriority}
          users={users}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}
    </div>
  );
}
