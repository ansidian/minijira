export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function relativeTime(dateStr) {
  const now = new Date();
  // Handle SQLite datetime format - ensure proper parsing
  const date = new Date(dateStr.replace(" ", "T") + "Z");
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
}

export function formatActivityDescription(entry) {
  const { action_type, old_value, new_value } = entry;

  // Helper to format status names
  const formatStatus = (status) => {
    const statusMap = {
      todo: "To Do",
      in_progress: "In Progress",
      review: "Review",
      done: "Done",
    };
    return statusMap[status] || status;
  };

  // Helper to format priority names
  const formatPriority = (priority) => {
    const priorityMap = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };
    return priorityMap[priority] || priority;
  };

  switch (action_type) {
    case "issue_created":
      return "created issue";
    case "subtask_created":
      return "created subtask";
    case "issue_deleted":
      return "deleted issue";
    case "subtask_deleted":
      return "deleted subtask";
    case "status_changed":
      return (
        <>
          changed status from <strong>{formatStatus(old_value)}</strong> to{" "}
          <strong>{formatStatus(new_value)}</strong>
        </>
      );
    case "assignee_changed":
      if (!old_value || old_value === "null") {
        return "assigned issue";
      }
      return "reassigned issue";
    case "priority_changed":
      return (
        <>
          changed priority from <strong>{formatPriority(old_value)}</strong> to{" "}
          <strong>{formatPriority(new_value)}</strong>
        </>
      );
    case "comment_added":
      return "added a comment";
    default:
      return action_type.replace(/_/g, " ");
  }
}

export function linkifyText(text) {
  if (!text) return [];

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the URL as a link
    parts.push({
      type: "link",
      content: match[0],
      url: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // If no URLs found, return the original text as a single part
  return parts.length === 0 ? [{ type: "text", content: text }] : parts;
}
