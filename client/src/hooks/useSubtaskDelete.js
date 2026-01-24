import { useRef, useCallback } from "react";
import { api } from "../utils/api";
import { notifyError, notifyUndo } from "../utils/notify";

export function useSubtaskDelete({ currentUserId, onSubtaskChange, setSubtasks }) {
  const pendingDeletesRef = useRef(new Map());

  const handleDelete = useCallback(async (subtaskId, subtaskTitle, allSubtasks) => {
    const existingPending = pendingDeletesRef.current.get(subtaskId);
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
      pendingDeletesRef.current.delete(subtaskId);
    }

    const snapshot = { subtasks: [...allSubtasks] };

    // Optimistic removal
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
      message: `Deleted "${subtaskTitle}".`,
      onUndo: () => {
        const pending = pendingDeletesRef.current.get(subtaskId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingDeletesRef.current.delete(subtaskId);
        setSubtasks(pending.snapshot.subtasks);
      },
    });
  }, [currentUserId, onSubtaskChange, setSubtasks]);

  return { handleDelete };
}
