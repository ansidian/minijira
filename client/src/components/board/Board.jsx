import { useEffect, useRef, useState } from "react";
import { Column } from "./Column";
import { ColumnIndicators } from "./ColumnIndicators";
import { useMobile } from "../../hooks/useMobile";

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
  paginationState,
  onLoadMore,
}) {
  const isMobile = useMobile();
  const boardRef = useRef(null);
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  // Track which column is centered using IntersectionObserver
  useEffect(() => {
    if (!isMobile || !boardRef.current) return;

    const columns = boardRef.current.querySelectorAll('.column');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Array.from(columns).indexOf(entry.target);
            if (index !== -1) {
              setActiveColumnIndex(index);
            }
          }
        });
      },
      {
        root: boardRef.current,
        threshold: 0.5,
      }
    );

    columns.forEach((col) => observer.observe(col));

    return () => observer.disconnect();
  }, [isMobile]);

  return (
    <>
      <div className="board" ref={boardRef}>
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
            paginationState={paginationState?.[column.status]}
            onLoadMore={() => onLoadMore?.(column.status)}
          />
        ))}
      </div>
      {isMobile && (
        <ColumnIndicators
          activeIndex={activeColumnIndex}
          totalColumns={COLUMNS.length}
        />
      )}
    </>
  );
}
