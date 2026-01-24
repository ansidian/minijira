import { useRef, useCallback } from "react";
import { api } from "../utils/api";
import { notifyApiError, notifyUndo } from "../utils/notify";

export function useSubtaskDelete({ currentUserId, onSubtaskChange, setSubtasks }) {
  const pendingDeletesRef = useRef(new Map());

  const handleDelete = useCallback(async (subtaskId, subtaskTitle, parentId) => {
    // Check for existing pending delete
    const existingPending = pendingDeletesRef.current.get(subtaskId);
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
      pendingDeletesRef.current.delete(subtaskId);
    }

    // 1. Snapshot the subtask for rollback
    let subtaskSnapshot = null;
    setSubtasks((prev) => {
      const found = prev.find((s) => s.id === subtaskId);
      if (found) subtaskSnapshot = { ...found };
      return prev;
    });

    if (!subtaskSnapshot) return;

    // 2. Remove optimistically
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

    // 3. Set up undo with timeout
    const timeoutId = setTimeout(async () => {
      try {
        // Delete on server
        await api.delete(`/issues/${subtaskId}`, { user_id: currentUserId });

        // Notify parent (for counts update)
        onSubtaskChange?.(parentId);
      } catch (error) {
        // Rollback: restore subtask
        setSubtasks((prev) => {
          // Maintain original position if possible
          const index = prev.findIndex((s) => s.id > subtaskId);
          if (index === -1) {
            return [...prev, subtaskSnapshot];
          }
          return [...prev.slice(0, index), subtaskSnapshot, ...prev.slice(index)];
        });

        // Show retry toast
        notifyApiError({
          error,
          operation: "delete subtask",
          onRetry: () => handleDelete(subtaskId, subtaskTitle, parentId),
        });
      } finally {
        pendingDeletesRef.current.delete(subtaskId);
      }
    }, 7000);

    pendingDeletesRef.current.set(subtaskId, { timeoutId, snapshot: subtaskSnapshot });

    notifyUndo({
      title: "Subtask deleted",
      message: `Deleted "${subtaskTitle}".`,
      onUndo: () => {
        const pending = pendingDeletesRef.current.get(subtaskId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingDeletesRef.current.delete(subtaskId);
        setSubtasks((prev) => {
          // Restore at original position
          const index = prev.findIndex((s) => s.id > subtaskId);
          if (index === -1) {
            return [...prev, pending.snapshot];
          }
          return [...prev.slice(0, index), pending.snapshot, ...prev.slice(index)];
        });
      },
    });
  }, [currentUserId, onSubtaskChange, setSubtasks]);

  return { handleDelete };
}
