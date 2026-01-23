import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  HoverCard,
  Progress,
  Stack,
  Tooltip,
} from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { isMac } from "../../utils/platform";

export function Header({
  stats,
  statsBadgeAnimate,
  allExpanded,
  toggleAllSubtasks,
  hasNewActivity,
  setShowActivityLog,
  isUserLocked,
  colorScheme,
  setColorScheme,
  users,
  currentUser,
  currentUserId,
  setCurrentUserId,
}) {
  const totalStats =
    Number.isFinite(stats?.total) && stats.total > 0
      ? stats.total
      : (stats?.todo || 0) +
        (stats?.in_progress || 0) +
        (stats?.review || 0) +
        (stats?.done || 0);

  return (
    <header className={`header ${isUserLocked ? "user-locked" : ""}`}>
      <div className="logo">
        <div className="logo-icon">MJ</div>
        <span>MiniJira</span>
        <Button
          variant="light"
          size="sm"
          color="blue"
          onClick={toggleAllSubtasks}
          disabled={isUserLocked}
          className="subtask-toggle-desktop"
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
          <span className="subtask-toggle-text-full">
            {allExpanded ? "Hide All Subtasks" : "Show All Subtasks"}
          </span>
        </Button>
        {/* Condensed stats badge with hover detail */}
          <HoverCard width={380} shadow="md" position="bottom" withArrow>
            <HoverCard.Target>
            <Badge
              size="lg"
              variant="light"
              color="gray"
              style={{
                cursor: "pointer",
                marginLeft: "1rem",
                transition: "transform 0.2s ease",
                transform: statsBadgeAnimate ? "scale(1.15)" : "scale(1)",
              }}
            >
              <span className="stats-badge">
                <span className="stats-pill-part stats-pill-todo">
                  {stats?.todo || 0}
                </span>
                <span className="stats-pill-sep">/</span>
                <span className="stats-pill-part stats-pill-progress">
                  {stats?.in_progress || 0}
                </span>
                <span className="stats-pill-sep">/</span>
                <span className="stats-pill-part stats-pill-review">
                  {stats?.review || 0}
                </span>
                <span className="stats-pill-sep">/</span>
                <span className="stats-pill-part stats-pill-done">
                  {stats?.done || 0}
                </span>
              </span>
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap="xs">
              <div className="stats-title">Issue Stats</div>
              {/* Progress bars */}
              <Stack gap={8}>
                <div className="stat-row">
                  <span className="stat-label">To Do</span>
                  <Progress
                    value={
                      (stats.todo /
                        Math.max(
                          1,
                          stats.todo +
                            stats.in_progress +
                            stats.review +
                            stats.done
                        )) *
                      100
                    }
                    color="gray"
                  />
                  <span className="stat-count">{stats.todo}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">In Progress</span>
                  <Progress
                    value={
                      (stats.in_progress /
                        Math.max(
                          1,
                          stats.todo +
                            stats.in_progress +
                            stats.review +
                            stats.done
                        )) *
                      100
                    }
                    color="blue"
                  />
                  <span className="stat-count">{stats.in_progress}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Review</span>
                  <Progress
                    value={
                      (stats.review /
                        Math.max(
                          1,
                          stats.todo +
                            stats.in_progress +
                            stats.review +
                            stats.done
                        )) *
                      100
                    }
                    color="violet"
                  />
                  <span className="stat-count">{stats.review}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Done</span>
                  <Progress
                    value={
                      (stats.done /
                        Math.max(
                          1,
                          stats.todo +
                            stats.in_progress +
                            stats.review +
                            stats.done
                        )) *
                      100
                    }
                    color="green"
                  />
                  <span className="stat-count">{stats.done}</span>
                </div>
              </Stack>
              <div className="stats-footer">Updated in real time</div>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      </div>
      <div className="header-right">
        {/* Fake search bar button */}
        <button
          className="search-button"
          onClick={() => spotlight.open()}
          disabled={isUserLocked}
          aria-label="Search issues"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="search-icon"
          >
            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
            <path d="M21 21l-6 -6"></path>
          </svg>
          <span className="search-text">Search</span>
          <span className="search-shortcut">
            {isMac ? "⌘ + K" : "Ctrl + K"}
          </span>
        </button>
        {/* Activity log button */}
        <Tooltip label="Recent Activity">
          <div style={{ position: "relative" }}>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setShowActivityLog(true)}
              disabled={isUserLocked}
              aria-label="View activity log"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </ActionIcon>
            {hasNewActivity && (
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-red-6)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </Tooltip>
        {/* Theme toggle button */}
        <Tooltip
          label={`Switch to ${colorScheme === "dark" ? "light" : "dark"} mode`}
        >
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() =>
              setColorScheme(colorScheme === "dark" ? "light" : "dark")
            }
            disabled={isUserLocked}
            aria-label="Toggle theme"
          >
            {colorScheme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </ActionIcon>
        </Tooltip>
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
              setCurrentUserId(
                e.target.value ? parseInt(e.target.value) : null
              )
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
            color="blue"
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
      </div>
    </header>
  );
}
