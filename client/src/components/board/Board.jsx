import { Column } from "./Column";

const COLUMNS = [
  { id: "todo", title: "To Do", status: "todo" },
  { id: "in_progress", title: "In Progress", status: "in_progress" },
  { id: "review", title: "Review", status: "review" },
  { id: "done", title: "Done", status: "done" },
];

export function Board({
  issuesByStatus,
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
  return (
    <div className="board">
      {COLUMNS.map((column) => (
        <Column
          key={column.id}
          column={column}
          issues={issuesByStatus[column.status]}
          users={users}
          onIssueClick={onIssueClick}
          onAddClick={() => onAddClick(column.status)}
          onDrop={onDrop}
          onStatusChange={onStatusChange}
          onUpdateIssue={onUpdateIssue}
          onDeleteIssue={onDeleteIssue}
          onSubtaskChange={onSubtaskChange}
          expandedIssues={expandedIssues}
          subtasksCache={subtasksCache}
          onToggleSubtasks={onToggleSubtasks}
          onRequestAddSubtask={onRequestAddSubtask}
          isTouchDevice={isTouchDevice}
        />
      ))}
    </div>
  );
}
