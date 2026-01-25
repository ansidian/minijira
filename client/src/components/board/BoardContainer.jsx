import { Board } from "./Board";
import { FilterPanel } from "./FilterPanel";
import { useBoard } from "../../contexts/hooks/useBoard";
import { useUI } from "../../contexts/UIContext";
import { useUsers } from "../../contexts/UsersContext";

export function BoardContainer({ isTouchDevice }) {
  const {
    issuesByStatus,
    users,
    expandedIssues,
    subtasksCache,
    paginationState,
    handleStatusChange,
    updateIssue,
    deleteIssue,
    handleSubtaskChange,
    toggleSubtasks,
    loadMoreIssues,
    requestAddSubtask,
    filterPanelExpanded,
    handleFiltersChange,
  } = useBoard();
  const { setCreateStatus, setShowCreateModal, setSelectedIssue } = useUI();
  const { currentUserId } = useUsers();

  return (
    <>
      <FilterPanel
        expanded={filterPanelExpanded}
        currentUserId={currentUserId}
        onFiltersChange={handleFiltersChange}
      />
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
        paginationState={paginationState}
        onLoadMore={loadMoreIssues}
      />
    </>
  );
}
