import { Badge } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

export function IssueDetailHeader({ issue, isSubtask, onViewIssue }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {/* Parent issue breadcrumb for subtasks */}
      {isSubtask && issue.parent_key && (
        <button
          className="modal-header-parent"
          onClick={() => onViewIssue(issue.parent_id)}
        >
          <IconArrowLeft size={12} />
          {issue.parent_key}
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span className="modal-header-key">{issue.key}</span>
        {isSubtask && (
          <Badge
            size="xs"
            variant="light"
            color="violet"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginTop: "10px",
            }}
          >
            Subtask
          </Badge>
        )}
      </div>
    </div>
  );
}
