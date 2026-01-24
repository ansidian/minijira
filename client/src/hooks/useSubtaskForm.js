import { useState, useCallback } from "react";
import { useHotkeys } from "@mantine/hooks";
import { api } from "../utils/api";
import { generateTempId } from "../utils/tempId";
import { notifyApiError } from "../utils/notify";

export function useSubtaskForm({
  parentIssue,
  currentUserId,
  onSubtaskCreated,
  onSubtaskChange,
  subtasks,
  setSubtasks,
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

    const tempId = generateTempId();
    const submittedTitle = title.trim();
    const submittedPriority = priority;
    const submittedAssignee = assignee;

    // Create optimistic subtask
    const optimisticSubtask = {
      id: tempId,
      key: null, // Will be assigned by server
      title: submittedTitle,
      status: "todo",
      priority: submittedPriority,
      parent_id: parentIssue.id,
      assignee_id: submittedAssignee || null,
      assignee_name: null,
      assignee_color: null,
      reporter_id: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isPending: true,
    };

    // 1. Clear input immediately for better UX
    resetForm();

    // 2. Add optimistically to local state
    setSubtasks((prev) => [...prev, optimisticSubtask]);

    try {
      // 3. Create on server
      const created = await api.post("/issues", {
        title: submittedTitle,
        parent_id: parentIssue.id,
        status: "todo",
        priority: submittedPriority,
        assignee_id: submittedAssignee || null,
        reporter_id: currentUserId,
      });

      // 4. Replace temp with real subtask
      setSubtasks((prev) =>
        prev.map((s) => (s.id === tempId ? created : s))
      );

      // 5. Notify parent (for counts update, etc)
      onSubtaskCreated?.(created);
      onSubtaskChange?.(parentIssue.id);
    } catch (error) {
      // 6. Mark as failing for ghost animation
      setSubtasks((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, _isFailing: true } : s))
      );

      // Wait for ghost animation (~500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 7. Remove optimistic subtask
      setSubtasks((prev) => prev.filter((s) => s.id !== tempId));

      // 8. Show retry toast
      notifyApiError({
        error,
        operation: "create subtask",
        onRetry: () => {
          setTitle(submittedTitle);
          setPriority(submittedPriority);
          setAssignee(submittedAssignee);
          setShowForm(true);
          // Note: form won't auto-submit, user clicks again
        },
      });
    }
  }, [title, priority, assignee, parentIssue.id, currentUserId, onSubtaskCreated, onSubtaskChange, resetForm, setSubtasks]);

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
