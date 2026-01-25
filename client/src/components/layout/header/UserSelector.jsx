import { Avatar, Button } from "@mantine/core";

export function UserSelector({
  users,
  currentUser,
  currentUserId,
  setCurrentUserId,
  allExpanded,
  toggleAllSubtasks,
  isUserLocked,
}) {
  return (
    <div className={`user-selector ${!currentUserId ? "unselected" : ""}`}>
      {currentUser && (
        <Avatar
          color={currentUser.avatar_color}
          name={currentUser.name}
          size="md"
        />
      )}
      <select
        className="user-select"
        value={currentUserId || ""}
        onChange={(e) =>
          setCurrentUserId(e.target.value ? parseInt(e.target.value) : null)
        }
      >
        <option value="">Select yourself...</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <Button
        variant="light"
        size="sm"
        color="orange"
        onClick={toggleAllSubtasks}
        disabled={isUserLocked}
        className="subtask-toggle-mobile"
        leftSection={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: allExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        }
        style={{ marginLeft: "1rem" }}
      >
        <span className="subtask-toggle-text-mobile">Subtasks</span>
      </Button>
    </div>
  );
}
