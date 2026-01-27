import { useEffect, useState } from "react";
import { api } from "../utils/api";

export function useIssueDetailState({
  issue,
  currentUserId,
  onUpdate,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || "");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [shake, setShake] = useState(false);
  const [fieldToFocus, setFieldToFocus] = useState(null);

  const isEditDirty =
    editing &&
    (title !== issue.title || description !== (issue.description || ""));

  const isSubtask = !!issue.parent_id;

  useEffect(() => {
    setTitle(issue.title);
    setDescription(issue.description || "");
    setEditing(false);
    setConfirmingCancel(false);
  }, [issue.id]);

  useEffect(() => {
    loadComments();
  }, [issue.id]);

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
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    await api.post(`/issues/${issue.id}/comments`, {
      body: newComment.trim(),
      user_id: currentUserId || null,
    });
    setNewComment("");
    loadComments();
  }

  function handleCloseAttempt(onClose) {
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

  function startEditing(field) {
    setFieldToFocus(field);
    setEditing(true);
  }

  return {
    editing,
    setEditing,
    title,
    setTitle,
    description,
    setDescription,
    comments,
    newComment,
    setNewComment,
    confirmingCancel,
    setConfirmingCancel,
    shake,
    isEditDirty,
    isSubtask,
    handleSave,
    handleAddComment,
    handleCloseAttempt,
    handleCancelEdit,
    startEditing,
  };
}
