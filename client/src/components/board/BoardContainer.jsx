import { Board } from "./Board";
import { useBoard, useUI } from "../../contexts";

export function BoardContainer({ isTouchDevice }) {
  const {
    issuesByStatus,
    users,
    expandedIssues,
    subtasksCache,
    handleStatusChange,
    updateIssue,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
    requestAddSubtask,
  } = useBoard();
  const { setCreateStatus, setShowCreateModal, setSelectedIssue } = useUI();

  return (
    <Board
      issuesByStatus={issuesByStatus}
      users={users}
      onIssueClick={setSelectedIssue}
      onAddClick={(status) => {
        setCreateStatus(status);
        setShowCreateModal(true);
      }}
      onDrop={handleStatusChange}
      onStatusChange={handleStatusChange}
      onUpdateIssue={updateIssue}
      onDeleteIssue={deleteIssue}
      onSubtaskChange={handleSubtaskChange}
      expandedIssues={expandedIssues}
      subtasksCache={subtasksCache}
      onToggleSubtasks={toggleSubtasks}
      onRequestAddSubtask={requestAddSubtask}
      isTouchDevice={isTouchDevice}
    />
  );
}
