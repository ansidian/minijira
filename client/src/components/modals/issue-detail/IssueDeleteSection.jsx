import { useState } from "react";
import { Button, Collapse, Group } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconTrash } from "@tabler/icons-react";

export function IssueDeleteSection({
  isSubtask,
  confirmingDelete,
  setConfirmingDelete,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="danger-zone">
      <button
        className="danger-zone-trigger"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <span>Danger zone</span>
      </button>

      <Collapse in={expanded}>
        <div className="danger-zone-content">
          {!confirmingDelete ? (
            <Button
              variant="light"
              color="red"
              size="sm"
              fullWidth
              leftSection={<IconTrash size={14} />}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete {isSubtask ? "Subtask" : "Issue"}
            </Button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                }}
              >
                This cannot be undone
              </span>
              <Group gap="sm" justify="center">
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button variant="filled" color="red" size="sm" onClick={onDelete}>
                  Yes, Delete
                </Button>
              </Group>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
