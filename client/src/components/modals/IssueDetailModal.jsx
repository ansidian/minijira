import { Button, Modal } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconArchiveOff } from "@tabler/icons-react";
import { SubtasksSection } from "./SubtasksSection";
import { IssueDetailHeader } from "./issue-detail/IssueDetailHeader";
import { IssueDetailFields } from "./issue-detail/IssueDetailFields";
import { IssueMetaPanel } from "./issue-detail/IssueMetaPanel";
import { IssueComments } from "./issue-detail/IssueComments";
import { IssueDangerSection } from "./issue-detail/IssueDangerSection";
import { useIssueDetailState } from "../../hooks/useIssueDetailState";
import { useMobile } from "../../hooks/useMobile";

export function IssueDetailModal({
  issue,
  users,
  currentUserId,
  onClose,
  onUpdate,
  onMetaUpdate,
  onDelete,
  onArchive,
  onUnarchive,
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

  const isMobile = useMobile();

  // Hotkey for save (Cmd/Ctrl + Enter) when editing title/description
  useHotkeys(
    [
      [
        "mod+Enter",
        () => {
          if (editing) {
            handleSave();
          }
        },
      ],
    ],
    [],
    true,
  );

  return (
    <Modal
      opened={true}
      onClose={() => handleCloseAttempt(onClose)}
      title={
        <IssueDetailHeader
          issue={issue}
          isSubtask={isSubtask}
          onViewIssue={onViewIssue}
        />
      }
      withCloseButton={true}
      fullScreen={isMobile}
      radius={isMobile ? 0 : undefined}
      transitionProps={{ transition: isMobile ? "fade" : "pop", duration: 200 }}
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
            : "linear-gradient(to right, var(--bg-tertiary) calc(100% - 281px), var(--border-primary) calc(100% - 281px), var(--border-primary) calc(100% - 280px), var(--bg-secondary) calc(100% - 280px))",
        },
        close: {
          marginRight: "4px",
        },
      }}
      size="xl"
      padding={0}
    >
      <div className="modal-two-column">
        {/* Main content area - left side */}
        <div className="modal-main-content">
          {issue.archived_at && (
            <div className="archived-banner">
              <span>This {isSubtask ? "subtask" : "issue"} is archived</span>
              <Button
                variant="light"
                color="gray"
                size="xs"
                leftSection={<IconArchiveOff size={14} />}
                onClick={() => onUnarchive(issue.id)}
              >
                Unarchive
              </Button>
            </div>
          )}

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

          {/* Subtasks Section - only show for parent issues */}
          {!isSubtask && (
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
          )}

          <IssueComments
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            onAddComment={handleAddComment}
          />
        </div>

        {/* Sidebar - right side */}
        <div className="modal-sidebar">
          <IssueMetaPanel
            issue={issue}
            users={users}
            onStatusChange={onStatusChange}
            onUpdate={onMetaUpdate}
            isMobile={isMobile}
          />

          <IssueDangerSection
            issue={issue}
            isSubtask={isSubtask}
            onDelete={() => onDelete(issue.id)}
            onArchive={() => onArchive(issue.id)}
          />
        </div>
      </div>
    </Modal>
  );
}
