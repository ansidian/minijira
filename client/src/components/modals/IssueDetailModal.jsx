import { Modal } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { SubtasksSection } from "./SubtasksSection";
import { IssueDetailHeader } from "./issue-detail/IssueDetailHeader";
import { IssueDetailFields } from "./issue-detail/IssueDetailFields";
import { IssueMetaPanel } from "./issue-detail/IssueMetaPanel";
import { IssueComments } from "./issue-detail/IssueComments";
import { IssueDeleteSection } from "./issue-detail/IssueDeleteSection";
import { useIssueDetailState } from "../../hooks/useIssueDetailState";

export function IssueDetailModal({
  issue,
  users,
  currentUserId,
  onClose,
  onUpdate,
  onMetaUpdate,
  onDelete,
  onStatusChange,
  onViewIssue,
  onSubtaskChange,
  autoShowSubtaskForm,
  onSubtaskFormShown,
  isTouchDevice,
}) {
  const {
    editing,
    title,
    setTitle,
    description,
    setDescription,
    comments,
    newComment,
    setNewComment,
    confirmingDelete,
    setConfirmingDelete,
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
  } = useIssueDetailState({
    issue,
    currentUserId,
    onUpdate,
  });

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

  return (
    <Modal
      opened={true}
      onClose={() => handleCloseAttempt(onClose)}
      title={<IssueDetailHeader issue={issue} isSubtask={isSubtask} onViewIssue={onViewIssue} />}
      withCloseButton={true}
      classNames={{ content: shake ? "shake" : "" }}
      size="lg"
    >
      <IssueDetailFields
        editing={editing}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        isEditDirty={isEditDirty}
        confirmingCancel={confirmingCancel}
        setConfirmingCancel={setConfirmingCancel}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
        onStartEditTitle={() => startEditing("title")}
        onStartEditDescription={() => startEditing("description")}
      />

      <IssueMetaPanel
        issue={issue}
        users={users}
        onStatusChange={onStatusChange}
        onUpdate={onMetaUpdate}
      />

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

      <IssueComments
        comments={comments}
        newComment={newComment}
        setNewComment={setNewComment}
        onAddComment={handleAddComment}
      />

      <IssueDeleteSection
        isSubtask={isSubtask}
        confirmingDelete={confirmingDelete}
        setConfirmingDelete={setConfirmingDelete}
        onDelete={() => onDelete(issue.id)}
      />
    </Modal>
  );
}
