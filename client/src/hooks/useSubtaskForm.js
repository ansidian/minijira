import { useState, useCallback } from "react";
import { useHotkeys } from "@mantine/hooks";
import { api } from "../utils/api";

export function useSubtaskForm({
  parentIssue,
  currentUserId,
  onSubtaskCreated,
  onSubtaskChange,
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("medium");

  const resetForm = useCallback(() => {
    setTitle("");
    setAssignee("");
    setPriority("medium");
    setShowForm(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    const newSubtask = await api.post("/issues", {
      title: title.trim(),
      parent_id: parentIssue.id,
      status: "todo",
      priority,
      assignee_id: assignee || null,
      reporter_id: currentUserId,
    });

    onSubtaskCreated?.(newSubtask);
    onSubtaskChange?.(parentIssue.id);
    resetForm();
  }, [title, priority, assignee, parentIssue.id, currentUserId, onSubtaskCreated, onSubtaskChange, resetForm]);

  // Cmd/Ctrl+Enter hotkey for submit
  useHotkeys(
    [["mod+Enter", () => { if (showForm && title.trim()) handleSubmit(); }]],
    [],
    true
  );

  return {
    showForm,
    setShowForm,
    title,
    setTitle,
    assignee,
    setAssignee,
    priority,
    setPriority,
    handleSubmit,
    resetForm,
  };
}
