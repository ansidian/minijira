import { useEffect, useMemo } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  HoverCard,
  Progress,
  Stack,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { Spotlight, spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { ContextMenuProvider } from "mantine-contextmenu";
import "mantine-contextmenu/styles.css";
import { BoardContainer } from "./components/board";
import { ActivityLogModal, CreateIssueModal, IssueDetailModal } from "./components/modals";
import { UnassignedAvatar } from "./components/shared";
import {
  ActivityProvider,
  BoardProvider,
  IssuesProvider,
  useActivity,
  useIssues,
  useUI,
  useUsers,
} from "./contexts";
import { useStatsAnimation, useSubtaskToggle } from "./hooks";
import { api, getPriorityColor, isMac, isTouchDevice as getIsTouchDevice } from "./utils";

export function AppShell() {
  return (
    <IssuesProviderWrapper>
      <ActivityProvider>
        <BoardProvider>
          <AppContent />
        </BoardProvider>
      </ActivityProvider>
    </IssuesProviderWrapper>
  );
}

function IssuesProviderWrapper({ children }) {
  const { currentUserId } = useUsers();
  const { selectedIssue, setSelectedIssue } = useUI();

  return (
    <IssuesProvider
      currentUserId={currentUserId}
      selectedIssue={selectedIssue}
      setSelectedIssue={setSelectedIssue}
    >
      {children}
    </IssuesProvider>
  );
}

function AppContent() {
  const {
    issues,
    allIssues,
    stats,
    loadData,
    createIssue,
    deleteIssue,
    updateIssue,
    handleStatusChange,
    handleSubtaskChange,
  } = useIssues();
  const {
    selectedIssue,
    setSelectedIssue,
    showCreateModal,
    setShowCreateModal,
    createStatus,
    setCreateStatus,
    autoShowSubtaskForm,
    setAutoShowSubtaskForm,
    statsBadgeAnimate,
    setStatsBadgeAnimate,
    previousStats,
    setPreviousStats,
  } = useUI();
  const { showActivityLog, setShowActivityLog, hasNewActivity } = useActivity();
  const { users, currentUserId, setCurrentUserId } = useUsers();
  const { allExpanded, toggleAllSubtasks } = useSubtaskToggle();

  // Theme toggle
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Hotkey for theme toggle (Cmd/Ctrl + J)
  useHotkeys(
    [
      [
        "mod+J",
        () => setColorScheme(colorScheme === "dark" ? "light" : "dark"),
      ],
      ["mod+I", () => setShowActivityLog((prev) => !prev)],
    ],
    [],
    true
  );

  // Detect if this is a touch device
  const isTouchDevice = getIsTouchDevice();

  useStatsAnimation({
    stats,
    previousStats,
    setPreviousStats,
    setStatsBadgeAnimate,
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Handle viewing a different issue (for subtask navigation)
  async function handleViewIssue(issueId) {
    const issue = await api.get(`/issues/${issueId}`);
    setSelectedIssue(issue);
  }

  async function handleCreateIssue(data) {
    await createIssue(data);
    setShowCreateModal(false);
  }

  async function handleUpdateIssue(issueId, data) {
    await updateIssue(issueId, data);
  }

  async function handleDeleteIssue(issueId) {
    await deleteIssue(issueId);
    notifications.show({
      title: "Issue deleted",
      message: "The issue has been removed",
      color: "red",
    });
  }

  const currentUser = users.find((u) => u.id === currentUserId);

  // Prepare spotlight actions from all issues (memoized to prevent unnecessary recalculations)
  const spotlightActions = useMemo(
    () =>
      allIssues.map((issue) => {
        const isSubtask = !!issue.parent_id;

        return {
          id: issue.id.toString(),
          label: issue.title,
          description: issue.description || "",
          onClick: () => setSelectedIssue(issue),
          keywords: [issue.key, issue.title, issue.description || ""].join(" "),
          leftSection: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              {/* Indentation for subtasks with status-based styling */}
              {isSubtask && (
                <div
                  style={{
                    width: "16px",
                    height:
                      issue.status === "done"
                        ? "6px"
                        : issue.status === "in_progress"
                        ? "4px"
                        : issue.status === "review"
                        ? "5px"
                        : "2px",
                    backgroundColor:
                      issue.status === "todo"
                        ? "#71717a"
                        : issue.status === "in_progress"
                        ? "#3b82f6"
                        : issue.status === "review"
                        ? "#a855f7"
                        : "#22c55e",
                    flexShrink: 0,
                    borderRadius: "2px",
                  }}
                />
              )}
              {/* Status indicator */}
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor:
                    issue.status === "todo"
                      ? "#71717a"
                      : issue.status === "in_progress"
                      ? "#3b82f6"
                      : issue.status === "review"
                      ? "#a855f7"
                      : "#22c55e",
                  flexShrink: 0,
                }}
              />
              {/* Issue key */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {issue.key}
              </div>
            </div>
          ),
          rightSection: (
            <Group gap="xs" wrap="nowrap">
              {/* Priority badge */}
              <Badge
                color={getPriorityColor(issue.priority)}
                size="sm"
                variant="light"
                style={{ flexShrink: 0 }}
              >
                {issue.priority}
              </Badge>
              {/* Assignee */}
              {issue.assignee_name ? (
                <Avatar
                  color={issue.assignee_color}
                  name={issue.assignee_name}
                  size="sm"
                  title={issue.assignee_name}
                  style={{ flexShrink: 0 }}
                />
              ) : (
                <UnassignedAvatar size="sm" />
              )}
            </Group>
          ),
        };
      }),
    [allIssues]
  );

  return (
    <ContextMenuProvider submenuDelay={150}>
      <Notifications position="top-right" autoClose={2000} />
      <Spotlight
        actions={spotlightActions}
        nothingFound="No issues found..."
        highlightQuery
        scrollable
        maxHeight={600}
        searchProps={{
          placeholder:
            "Search Issues... (Try 'issues:' or 'subtasks:' to filter)",
        }}
        filter={(query, actions) => {
          const lowerQuery = query.toLowerCase().trim();

          // Check for filter prefixes
          if (lowerQuery.startsWith("issues:")) {
            // Filter for parent issues only
            const searchTerm = lowerQuery.slice(7).trim();
            return actions.filter((action) => {
              const issue = allIssues.find(
                (i) => i.id.toString() === action.id
              );
              if (!issue || issue.parent_id) return false;
              if (!searchTerm) return true;
              return (
                issue.key.toLowerCase().includes(searchTerm) ||
                issue.title.toLowerCase().includes(searchTerm) ||
                (issue.description || "").toLowerCase().includes(searchTerm)
              );
            });
          } else if (lowerQuery.startsWith("subtasks:")) {
            // Filter for subtasks only
            const searchTerm = lowerQuery.slice(9).trim();
            return actions.filter((action) => {
              const issue = allIssues.find(
                (i) => i.id.toString() === action.id
              );
              if (!issue || !issue.parent_id) return false;
              if (!searchTerm) return true;
              return (
                issue.key.toLowerCase().includes(searchTerm) ||
                issue.title.toLowerCase().includes(searchTerm) ||
                (issue.description || "").toLowerCase().includes(searchTerm)
              );
            });
          }

          return actions.filter((action) => {
            const issue = allIssues.find((i) => i.id.toString() === action.id);
            if (!issue) return false;

            if (!lowerQuery) return true;

            return (
              issue.key.toLowerCase().includes(lowerQuery) ||
              issue.title.toLowerCase().includes(lowerQuery) ||
              (issue.description || "").toLowerCase().includes(lowerQuery)
            );
          });
        }}
      />

      <div className="app">
        {/* User Prompt Overlay */}
        {!currentUserId && (
          <div className="user-prompt-overlay">
            <div className="user-prompt-message">
              ↑ Please select yourself to get started
            </div>
          </div>
        )}

        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">MJ</div>
            <span>MiniJira</span>
            <Button
              variant="light"
              size="sm"
              color="blue"
              onClick={toggleAllSubtasks}
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
                  {stats.todo + stats.in_progress + stats.review + stats.done}
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
                        value={(stats.todo / Math.max(1, stats.todo + stats.in_progress + stats.review + stats.done)) * 100}
                        color="gray"
                      />
                      <span className="stat-count">{stats.todo}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">In Progress</span>
                      <Progress
                        value={(stats.in_progress / Math.max(1, stats.todo + stats.in_progress + stats.review + stats.done)) * 100}
                        color="blue"
                      />
                      <span className="stat-count">{stats.in_progress}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Review</span>
                      <Progress
                        value={(stats.review / Math.max(1, stats.todo + stats.in_progress + stats.review + stats.done)) * 100}
                        color="violet"
                      />
                      <span className="stat-count">{stats.review}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Done</span>
                      <Progress
                        value={(stats.done / Math.max(1, stats.todo + stats.in_progress + stats.review + stats.done)) * 100}
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
              label={`Switch to ${
                colorScheme === "dark" ? "light" : "dark"
              } mode`}
            >
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() =>
                  setColorScheme(colorScheme === "dark" ? "light" : "dark")
                }
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
            <div
              className={`user-selector ${!currentUserId ? "unselected" : ""}`}
            >
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

        {/* Board */}
        <main className="main">
          <BoardContainer isTouchDevice={isTouchDevice} />
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section">
              <span className="footer-label">Built by</span>
              <a
                href="https://github.com/ansidian"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg
                  className="footer-icon"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Andy Su
              </a>
            </div>
            <div className="footer-divider">•</div>
            <div className="footer-section">
              <span className="footer-label">Made with</span>
              <a
                href="https://react.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg
                  className="footer-icon"
                  viewBox="-11.5 -10.23174 23 20.46348"
                  fill="none"
                >
                  <circle cx="0" cy="0" r="2.05" fill="#61dafb" />
                  <g stroke="#61dafb" strokeWidth="1" fill="none">
                    <ellipse rx="11" ry="4.2" />
                    <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                    <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                  </g>
                </svg>
                React
              </a>
              <span className="footer-text">+</span>
              <a
                href="https://vitejs.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg className="footer-icon" viewBox="0 0 410 404" fill="none">
                  <path
                    d="M399.641 59.5246L215.643 388.545C211.844 395.338 202.084 395.378 198.228 388.618L10.5817 59.5563C6.38087 52.1896 12.6802 43.2665 21.0281 44.7586L205.223 77.6824C206.398 77.8924 207.601 77.8904 208.776 77.6763L389.119 44.8058C397.439 43.2894 403.768 52.1434 399.641 59.5246Z"
                    fill="url(#paint0_linear)"
                  />
                  <path
                    d="M292.965 1.5744L156.801 28.2552C154.563 28.6937 152.906 30.5903 152.771 32.8664L144.395 174.33C144.198 177.662 147.258 180.248 150.51 179.498L188.42 170.749C191.967 169.931 195.172 173.055 194.443 176.622L183.18 231.775C182.422 235.487 185.907 238.661 189.532 237.56L212.947 230.446C216.577 229.344 220.065 232.527 219.297 236.242L201.398 322.875C200.278 328.294 207.486 331.249 210.492 326.603L212.5 323.5L323.454 102.072C325.312 98.3645 322.108 94.137 318.036 94.9228L279.014 102.454C275.347 103.161 272.227 99.746 273.262 96.1583L298.731 7.86689C299.767 4.27314 296.636 0.855181 292.965 1.5744Z"
                    fill="url(#paint1_linear)"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear"
                      x1="6.00017"
                      y1="32.9999"
                      x2="235"
                      y2="344"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#41D1FF" />
                      <stop offset="1" stopColor="#BD34FE" />
                    </linearGradient>
                    <linearGradient
                      id="paint1_linear"
                      x1="194.651"
                      y1="8.81818"
                      x2="236.076"
                      y2="292.989"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFEA83" />
                      <stop offset="0.0833333" stopColor="#FFDD35" />
                      <stop offset="1" stopColor="#FFA800" />
                    </linearGradient>
                  </defs>
                </svg>
                Vite
              </a>
              <span className="footer-text">+</span>
              <a
                href="https://mantine.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg
                  className="footer-icon"
                  viewBox="0 0 32 32"
                  fill="currentColor"
                >
                  <path d="M16 2a14 14 0 1 0 14 14A14.016 14.016 0 0 0 16 2m0 26a12 12 0 1 1 12-12 12.014 12.014 0 0 1-12 12" />
                  <path d="M16 8a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8m0 14a6 6 0 1 1 6-6 6.006 6.006 0 0 1-6 6" />
                </svg>
                Mantine
              </a>
              <span className="footer-text">+</span>
              <a
                href="https://github.com/ansidian"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg
                  className="footer-icon"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                @ansidian
              </a>
            </div>
          </div>
        </footer>

        {/* Create Issue Modal */}
        {showCreateModal && (
          <CreateIssueModal
            users={users}
            currentUserId={currentUserId}
            createStatus={createStatus}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateIssue}
          />
        )}

        {/* Issue Detail Modal */}
        {selectedIssue && (
          <IssueDetailModal
            issue={selectedIssue}
            users={users}
            currentUserId={currentUserId}
            onClose={() => {
              setSelectedIssue(null);
              setAutoShowSubtaskForm(false);
            }}
            onUpdate={handleUpdateIssue}
            onDelete={handleDeleteIssue}
            onStatusChange={handleStatusChange}
            onViewIssue={handleViewIssue}
            onSubtaskChange={handleSubtaskChange}
            autoShowSubtaskForm={autoShowSubtaskForm}
            onSubtaskFormShown={() => setAutoShowSubtaskForm(false)}
            isTouchDevice={isTouchDevice}
          />
        )}

        {/* Activity Log Modal */}
        <ActivityLogModal
          opened={showActivityLog}
          onClose={() => setShowActivityLog(false)}
          onViewIssue={handleViewIssue}
        />
      </div>
    </ContextMenuProvider>
  );
}
