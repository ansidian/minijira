export const getPriorityColor = (priority) =>
  priority === "high" ? "red" : priority === "medium" ? "yellow" : "gray";

export const getStatusColor = (status) =>
  status === "done"
    ? "green"
    : status === "in_progress"
    ? "blue"
    : status === "review"
    ? "violet"
    : "gray";
