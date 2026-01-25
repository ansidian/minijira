import { useState } from "react";
import { Button } from "@mantine/core";
import { IssueCard } from "./IssueCard";
import { IssueCardSkeletons } from "../shared/IssueCardSkeleton";

export function Column({
  column,
  issues,
  users,
  onIssueClick,
  onAddClick,
  onDrop,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
  onSubtaskChange,
  expandedIssues,
  subtasksCache,
  onToggleSubtasks,
  onRequestAddSubtask,
  isTouchDevice,
  paginationState,
  onLoadMore,
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const issueId = e.dataTransfer.getData("issueId");
    if (issueId) {
      onDrop(parseInt(issueId), column.status);
    }
  }

  return (
    <div
      className={`column ${dragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title">
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                column.status === "todo"
                  ? "var(--status-todo)"
                  : column.status === "in_progress"
                  ? "var(--status-progress)"
                  : column.status === "review"
                  ? "var(--status-review)"
                  : "var(--status-done)",
            }}
          />
          {column.title}
        </div>
        <span className="column-count">
          {paginationState?.total ?? issues.length}
        </span>
      </div>
      <div className="column-content">
        {/* Show skeletons during initial load */}
        {paginationState?.loading && issues.length === 0 && (
          <IssueCardSkeletons count={3} />
        )}

        {/* Empty state when not loading and no issues */}
        {!paginationState?.loading && issues.length === 0 && (
          <div className="empty-column">Drop issues here</div>
        )}

        {/* Issue cards */}
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            users={users}
            onClick={onIssueClick}
            onStatusChange={onStatusChange}
            onUpdateIssue={onUpdateIssue}
            onDeleteIssue={onDeleteIssue}
            onSubtaskChange={onSubtaskChange}
            isExpanded={expandedIssues.has(issue.id)}
            subtasks={subtasksCache[issue.id] || []}
            onToggleSubtasks={onToggleSubtasks}
            onRequestAddSubtask={onRequestAddSubtask}
            isTouchDevice={isTouchDevice}
          />
        ))}

        {/* Load More button */}
        {paginationState?.hasMore && issues.length > 0 && (
          <div className="load-more-container">
            <Button
              variant="subtle"
              size="sm"
              fullWidth
              onClick={onLoadMore}
              loading={paginationState.loading}
              disabled={paginationState.loading}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
      <button className="add-issue-btn" onClick={onAddClick}>
        + Add {column.title}
      </button>
    </div>
  );
}
