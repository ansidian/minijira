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
      <>
        <Textarea
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          autosize
          minRows={1}
          mb="md"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          autosize
          minRows={2}
          mb="md"
        />
        <Group justify="flex-end" mb="xl">
          {!isEditDirty || !confirmingCancel ? (
            <>
              <Button
                variant="default"
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
              <Button variant="filled" onClick={onSave}>
                Save
              </Button>
            </>
          ) : (
            <>
              <span
                style={{
                  marginRight: "auto",
                  color: "var(--text-secondary)",
                }}
              >
                Discard changes?
              </span>
              <Button variant="light" color="orange" onClick={onCancelEdit}>
                Yes, Discard
              </Button>
              <Button variant="filled" onClick={() => setConfirmingCancel(false)}>
                Keep Editing
              </Button>
            </>
          )}
        </Group>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          marginBottom: "1rem",
          cursor: "pointer",
        }}
        onClick={onStartEditTitle}
      >
        <div
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 500,
            marginBottom: "0.25rem",
          }}
        >
          Title
        </div>
        <div
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: "var(--radius-sm)",
            minHeight: "36px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          marginBottom: "1rem",
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (e.target.tagName !== "A") {
            onStartEditDescription();
          }
        }}
      >
        <div
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 500,
            marginBottom: "0.25rem",
          }}
        >
          Description
        </div>
        <div
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: "var(--radius-sm)",
            minHeight: "60px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            fontSize: "var(--text-base)",
            lineHeight: "1.5",
            color: description ? "inherit" : "var(--text-muted)",
          }}
        >
          {description
            ? linkifyText(description).map((part, index) =>
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
              )
            : "Click to add a description..."}
        </div>
      </div>
    </>
  );
}
