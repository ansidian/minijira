import { useState } from "react";
import { IssueCard } from "./IssueCard";

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
                  ? "#71717a"
                  : column.status === "in_progress"
                  ? "#3b82f6"
                  : column.status === "review"
                  ? "#a855f7"
                  : "#22c55e",
            }}
          />
          {column.title}
        </div>
        <span className="column-count">{issues.length}</span>
      </div>
      <div className="column-content">
        {issues.length === 0 ? (
          <div className="empty-column">Drop issues here</div>
        ) : (
          issues.map((issue) => (
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
          ))
        )}
      </div>
      <button className="add-issue-btn" onClick={onAddClick}>
        + Add {column.title}
      </button>
    </div>
  );
}
