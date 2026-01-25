import { Button, Group, Textarea } from "@mantine/core";
import { linkifyText } from "../../../utils/formatters.jsx";

export function IssueDetailFields({
  editing,
  title,
  setTitle,
  description,
  setDescription,
  isEditDirty,
  confirmingCancel,
  setConfirmingCancel,
  onSave,
  onCancelEdit,
  onStartEditTitle,
  onStartEditDescription,
}) {
  if (editing) {
    return (
      <div className="modal-section">
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          autosize
          minRows={1}
          autoFocus
          styles={{
            input: {
              fontSize: "var(--text-lg)",
              fontWeight: 500,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              "&:focus": {
                borderColor: "var(--accent)",
              },
            },
          }}
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          autosize
          minRows={3}
          styles={{
            input: {
              fontSize: "var(--text-base)",
              lineHeight: 1.6,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              "&:focus": {
                borderColor: "var(--accent)",
              },
            },
          }}
        />
        <Group justify="flex-end" gap="sm">
          {!isEditDirty || !confirmingCancel ? (
            <>
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => {
                  if (isEditDirty) {
                    setConfirmingCancel(true);
                  } else {
                    onCancelEdit();
                  }
                }}
              >
                Cancel
              </Button>
              <Button variant="filled" size="sm" onClick={onSave}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <span
                style={{
                  marginRight: "auto",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Discard unsaved changes?
              </span>
              <Button
                variant="light"
                color="orange"
                size="sm"
                onClick={onCancelEdit}
              >
                Discard
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={() => setConfirmingCancel(false)}
              >
                Keep Editing
              </Button>
            </>
          )}
        </Group>
      </div>
    );
  }

  return (
    <div className="modal-section">
      {/* Title - editable block */}
      <div className="editable-block" onClick={onStartEditTitle}>
        <div className="editable-block-title">{title}</div>
      </div>

      {/* Description - editable block */}
      <div
        className="editable-block"
        onClick={(e) => {
          if (e.target.tagName !== "A") {
            onStartEditDescription();
          }
        }}
      >
        {description ? (
          <div className="editable-block-description">
            {linkifyText(description).map((part, index) =>
              part.type === "link" ? (
                <a
                  key={index}
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="comment-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part.content}
                </a>
              ) : (
                <span key={index}>{part.content}</span>
              )
            )}
          </div>
        ) : (
          <div className="editable-block-description editable-block-placeholder">
            Click to add a description...
          </div>
        )}
      </div>
    </div>
  );
}
