import { useState, useEffect } from "react";
import { version } from "../package.json";
import {
  Loader,
  Center,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  Group,
  Avatar,
  Badge,
  Progress,
  Paper,
  Stack,
  Checkbox,
  Tooltip,
  Collapse,
  HoverCard,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { Spotlight, spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { ContextMenuProvider, useContextMenu } from "mantine-contextmenu";
import "mantine-contextmenu/styles.css";
import { IconCheck } from "@tabler/icons-react";

const API_BASE = "/api";

// ============================================================================
// API HELPERS
// ============================================================================

const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  },
  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async patch(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(path) {
    await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

// Detect if user is on Mac
const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// Priority → color mapping
const getPriorityColor = (priority) =>
  priority === "high" ? "red" : priority === "medium" ? "yellow" : "gray";

// Status → color mapping
const getStatusColor = (status) =>
  status === "done" ? "green" : status === "in_progress" ? "blue" : "gray";

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Linkify text - convert URLs to clickable links
function linkifyText(text) {
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

// ============================================================================
// SMALL COMPONENTS
// ============================================================================

// Unassigned avatar placeholder - dashed circle
function UnassignedAvatar({ size = "md" }) {
  const sizes = {
    xs: { width: "18px", height: "18px" },
    sm: { width: "26px", height: "26px" },
    md: { width: "32px", height: "32px" },
  };
  const sizeStyles = sizes[size] || sizes.md;

  return (
    <div
      title="Unassigned"
      style={{
        ...sizeStyles,
        borderRadius: "50%",
        border: "2px dashed var(--mantine-color-gray-6)",
        backgroundColor: "transparent",
        flexShrink: 0,
      }}
    />
  );
}

// Column configuration
const COLUMNS = [
  { id: "todo", title: "To Do", status: "todo" },
  { id: "in_progress", title: "In Progress", status: "in_progress" },
  { id: "done", title: "Done", status: "done" },
];

// ============================================================================
// HOOKS
// ============================================================================

// Hook for generating context menu items for an issue
function useIssueContextMenu({
  issue,
  users,
  isTouchDevice,
  onViewDetails,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
  onRequestAddSubtask,
}) {
  const { showContextMenu } = useContextMenu();
  const isSubtask = !!issue.parent_id;

  const handleContextMenu = (e) => {
    // Don't show context menu on touch devices (preserve mobile drag & drop)
    if (isTouchDevice) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const menuItems = [
      {
        key: "view",
        title: "View Details",
        onClick: () => onViewDetails(issue),
      },
      { key: "divider-1" },
      {
        key: "status",
        title: "Change Status",
        items: [
          {
            key: "status-todo",
            title: "To Do",
            onClick: () => onStatusChange(issue.id, "todo"),
          },
          {
            key: "status-in_progress",
            title: "In Progress",
            onClick: () => onStatusChange(issue.id, "in_progress"),
          },
          {
            key: "status-done",
            title: "Done",
            onClick: () => onStatusChange(issue.id, "done"),
          },
        ],
      },
      {
        key: "priority",
        title: "Change Priority",
        items: [
          {
            key: "priority-low",
            title: "Low",
            onClick: () => onUpdateIssue(issue.id, { priority: "low" }),
          },
          {
            key: "priority-medium",
            title: "Medium",
            onClick: () => onUpdateIssue(issue.id, { priority: "medium" }),
          },
          {
            key: "priority-high",
            title: "High",
            onClick: () => onUpdateIssue(issue.id, { priority: "high" }),
          },
        ],
      },
      {
        key: "assignee",
        title: "Assign To",
        items: [
          {
            key: "assignee-unassigned",
            title: "Unassigned",
            onClick: () => onUpdateIssue(issue.id, { assignee_id: null }),
          },
          { key: "assignee-divider" },
          ...users.map((user) => ({
            key: `assignee-${user.id}`,
            title: user.name,
            onClick: () => onUpdateIssue(issue.id, { assignee_id: user.id }),
          })),
        ],
      },
    ];

    // Add "Add Subtask" option only for parent issues
    if (!isSubtask && onRequestAddSubtask) {
      menuItems.push(
        { key: "divider-2" },
        {
          key: "add-subtask",
          title: "Add Subtask",
          onClick: () => onRequestAddSubtask(issue),
        }
      );
    }

    // Add delete option
    menuItems.push(
      { key: "divider-3" },
      {
        key: "delete",
        title: isSubtask ? "Delete Subtask" : "Delete Issue",
        color: "red",
        onClick: async () => {
          await onDeleteIssue(issue.id);
        },
      }
    );

    showContextMenu(menuItems)(e);
  };

  return handleContextMenu;
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ todo: 0, in_progress: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState("todo");
  const [currentUserId, setCurrentUserId] = useState(() => {
    const saved = localStorage.getItem("minijira_user");
    return saved ? parseInt(saved) : null;
  });
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  const [subtasksCache, setSubtasksCache] = useState({});
  const [autoShowSubtaskForm, setAutoShowSubtaskForm] = useState(false);
  const [allIssues, setAllIssues] = useState([]); // All issues including subtasks for Spotlight
  const [statsBadgeAnimate, setStatsBadgeAnimate] = useState(false);
  const [previousStats, setPreviousStats] = useState(null);

  // Theme toggle
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Hotkey for theme toggle (Cmd/Ctrl + J)
  // triggerOnContentEditable: true allows it to work even when Spotlight is open
  useHotkeys([
    ['mod+J', () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')],
  ], [], true);

  // Detect if this is a touch device
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Persist user selection
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem("minijira_user", currentUserId.toString());
    }
  }, [currentUserId]);

  // Animate stats badge when stats change
  useEffect(() => {
    // Skip animation on initial load (when previousStats is null)
    if (!previousStats) {
      setPreviousStats(stats);
      return;
    }

    // Only animate if stats actually changed
    const hasChanged =
      previousStats.todo !== stats.todo ||
      previousStats.in_progress !== stats.in_progress ||
      previousStats.done !== stats.done;

    if (hasChanged) {
      setPreviousStats(stats);
      setStatsBadgeAnimate(true);
      const timer = setTimeout(() => setStatsBadgeAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [stats]); // Only depend on stats, not previousStats

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [issuesData, usersData, statsData, allIssuesData] = await Promise.all(
      [
        api.get("/issues"),
        api.get("/users"),
        api.get("/stats"),
        api.get("/issues?include_subtasks=true"),
      ]
    );
    setIssues(issuesData);
    setUsers(usersData);
    setStats(statsData);
    setAllIssues(allIssuesData);
    setLoading(false);
  }

  // Auto-expand issues with subtasks on first load
  useEffect(() => {
    if (issues.length > 0 && expandedIssues.size === 0) {
      const parentsWithSubtasks = issues.filter(
        (i) => !i.parent_id && i.subtask_count > 0
      );
      if (parentsWithSubtasks.length > 0) {
        const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
        setExpandedIssues(newExpanded);

        // Fetch all subtasks for expanded issues
        const fetchSubtasks = async () => {
          const newCache = {};
          for (const issue of parentsWithSubtasks) {
            const subtasks = await api.get(`/issues/${issue.id}/subtasks`);
            newCache[issue.id] = subtasks;
          }
          setSubtasksCache(newCache);
        };
        fetchSubtasks();
      }
    }
  }, [issues]);

  // Group issues by status - only show parent issues (not subtasks)
  const issuesByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = issues.filter(
      (i) => i.status === col.status && !i.parent_id
    );
    return acc;
  }, {});

  // Helper to refresh subtasks cache for expanded issues
  async function refreshSubtasksCache(issueIds) {
    const newCache = {};
    for (const issueId of issueIds) {
      const subtasks = await api.get(`/issues/${issueId}/subtasks`);
      newCache[issueId] = subtasks;
    }
    setSubtasksCache((prev) => ({ ...prev, ...newCache }));
  }

  // Handle status change (drag simulation via click)
  async function handleStatusChange(issueId, newStatus) {
    const updated = await api.patch(`/issues/${issueId}`, {
      status: newStatus,
    });
    setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
    setStats(await api.get("/stats"));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue(updated);
    }

    // If this issue has subtasks and is expanded, refresh them
    if (updated.subtask_count > 0 && expandedIssues.has(issueId)) {
      await refreshSubtasksCache([issueId]);
    }

    // If this is a subtask, refresh its parent's cache if expanded
    if (updated.parent_id && expandedIssues.has(updated.parent_id)) {
      await refreshSubtasksCache([updated.parent_id]);
    }

    // Refresh allIssues for Spotlight
    const allIssuesData = await api.get("/issues?include_subtasks=true");
    setAllIssues(allIssuesData);
  }

  // Create issue
  async function handleCreateIssue(data) {
    const newIssue = await api.post("/issues", data);
    setIssues((prev) => [newIssue, ...prev]);
    setStats(await api.get("/stats"));
    setShowCreateModal(false);

    // Refresh allIssues for Spotlight
    const allIssuesData = await api.get("/issues?include_subtasks=true");
    setAllIssues(allIssuesData);
  }

  // Update issue
  async function handleUpdateIssue(issueId, data) {
    const updated = await api.patch(`/issues/${issueId}`, data);
    setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));

    // Update selected issue if it's currently open
    if (selectedIssue?.id === issueId) {
      setSelectedIssue(updated);
    }

    // If this is a subtask, refresh its parent's cache if expanded
    if (updated.parent_id && expandedIssues.has(updated.parent_id)) {
      await refreshSubtasksCache([updated.parent_id]);
    }

    // Refresh allIssues for Spotlight
    const allIssuesData = await api.get("/issues?include_subtasks=true");
    setAllIssues(allIssuesData);
  }

  // Delete issue
  async function handleDeleteIssue(issueId) {
    await api.delete(`/issues/${issueId}`);

    // Reload all issues to ensure subtask counts are updated
    const [issuesData, statsData, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/stats"),
      api.get("/issues?include_subtasks=true"),
    ]);

    setIssues(issuesData);
    setStats(statsData);
    setAllIssues(allIssuesData);
    setSelectedIssue(null);

    // Refresh all expanded subtask caches to ensure they reflect the deletion
    const expandedIds = [...expandedIssues].filter((id) => id !== issueId);
    if (expandedIds.length > 0) {
      const newCache = {};
      for (const expandedId of expandedIds) {
        const subtasks = await api.get(`/issues/${expandedId}/subtasks`);
        newCache[expandedId] = subtasks;
      }
      setSubtasksCache(newCache);
    }

    // If this was a parent issue with expanded subtasks, clean it from expanded set
    if (expandedIssues.has(issueId)) {
      setExpandedIssues((prev) => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });
    }

    notifications.show({
      title: "Issue deleted",
      message: "The issue has been removed",
      color: "red",
    });
  }

  // Handle viewing a different issue (for subtask navigation)
  async function handleViewIssue(issueId) {
    const issue = await api.get(`/issues/${issueId}`);
    setSelectedIssue(issue);
  }

  // Refresh issues after subtask changes
  async function handleSubtaskChange(parentIdToExpand = null) {
    const [issuesData, allIssuesData] = await Promise.all([
      api.get("/issues"),
      api.get("/issues?include_subtasks=true"),
    ]);
    setIssues(issuesData);
    setAllIssues(allIssuesData);

    // Refresh all expanded subtasks caches
    const newCache = {};
    const issueIdsToRefresh = new Set(expandedIssues);

    // Also refresh cache for the currently selected issue if it's a parent with subtasks
    if (selectedIssue && !selectedIssue.parent_id) {
      issueIdsToRefresh.add(selectedIssue.id);
    }

    // If a specific parent should be expanded (e.g., after adding a subtask), add it
    if (parentIdToExpand) {
      issueIdsToRefresh.add(parentIdToExpand);
      // Also add to expandedIssues set to show it expanded
      setExpandedIssues(new Set([...expandedIssues, parentIdToExpand]));
    }

    for (const issueId of issueIdsToRefresh) {
      const subtasks = await api.get(`/issues/${issueId}/subtasks`);
      newCache[issueId] = subtasks;
    }
    setSubtasksCache(newCache);

    // Refresh selected issue to get updated subtask counts
    if (selectedIssue) {
      const updated = await api.get(`/issues/${selectedIssue.id}`);
      setSelectedIssue(updated);
    }
  }

  // Toggle subtask expansion and fetch if needed
  async function handleToggleSubtasks(issueId) {
    const newExpanded = new Set(expandedIssues);

    if (newExpanded.has(issueId)) {
      // Collapse
      newExpanded.delete(issueId);
    } else {
      // Expand - fetch subtasks if not cached
      newExpanded.add(issueId);
      if (!subtasksCache[issueId]) {
        const subtasks = await api.get(`/issues/${issueId}/subtasks`);
        setSubtasksCache((prev) => ({ ...prev, [issueId]: subtasks }));
      }
    }

    setExpandedIssues(newExpanded);
  }

  // Toggle all subtasks at once
  async function handleToggleAllSubtasks() {
    const parentsWithSubtasks = issues.filter(
      (i) => !i.parent_id && i.subtask_count > 0
    );

    // If all are expanded, collapse all. Otherwise, expand all.
    const allExpanded = parentsWithSubtasks.every((i) =>
      expandedIssues.has(i.id)
    );

    if (allExpanded) {
      // Collapse all
      setExpandedIssues(new Set());
    } else {
      // Expand all - fetch any missing subtasks
      const newExpanded = new Set(parentsWithSubtasks.map((i) => i.id));
      const newCache = { ...subtasksCache };

      for (const issue of parentsWithSubtasks) {
        if (!subtasksCache[issue.id]) {
          const subtasks = await api.get(`/issues/${issue.id}/subtasks`);
          newCache[issue.id] = subtasks;
        }
      }

      setSubtasksCache(newCache);
      setExpandedIssues(newExpanded);
    }
  }

  const currentUser = users.find((u) => u.id === currentUserId);

  // Prepare spotlight actions from all issues
  const spotlightActions = allIssues.map((issue) => {
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
                    : "2px",
                backgroundColor:
                  issue.status === "todo"
                    ? "#71717a"
                    : issue.status === "in_progress"
                    ? "#3b82f6"
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
  });

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

          // Default search (no prefix) - search all issues
          if (!query) return actions;
          return actions.filter((action) => {
            const issue = allIssues.find((i) => i.id.toString() === action.id);
            if (!issue) return false;
            return (
              issue.key.toLowerCase().includes(lowerQuery) ||
              issue.title.toLowerCase().includes(lowerQuery) ||
              (issue.description || "").toLowerCase().includes(lowerQuery)
            );
          });
        }}
      />
      <div className="app">
        {/* User Selection Prompt Overlay */}
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
              onClick={handleToggleAllSubtasks}
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
                    transform: issues
                      .filter((i) => !i.parent_id && i.subtask_count > 0)
                      .every((i) => expandedIssues.has(i.id))
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              }
              style={{ marginLeft: "1rem" }}
            >
              <span className="subtask-toggle-text-full">
                {issues
                  .filter((i) => !i.parent_id && i.subtask_count > 0)
                  .every((i) => expandedIssues.has(i.id))
                  ? "Hide All Subtasks"
                  : "Show All Subtasks"}
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
                    transform: statsBadgeAnimate ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  <span style={{ color: "var(--mantine-color-darkgray-4)" }}>
                    {stats.todo}
                  </span>{" "}
                  /{" "}
                  <span style={{ color: "var(--mantine-color-blue-4)" }}>
                    {stats.in_progress}
                  </span>{" "}
                  /{" "}
                  <span style={{ color: "var(--mantine-color-green-4)" }}>
                    {stats.done}
                  </span>
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Stack gap="sm">
                  {/* Progress bars */}
                  <div>
                    <Group gap="xs" mb={4}>
                      <span style={{ fontSize: "0.875rem", minWidth: "60px" }}>
                        <span style={{ fontWeight: 600 }}>{stats.todo}</span> to
                        do
                      </span>
                    </Group>
                    <Progress
                      value={
                        stats.total > 0 ? (stats.todo / stats.total) * 100 : 0
                      }
                      color="gray"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Group gap="xs" mb={4}>
                      <span style={{ fontSize: "0.875rem", minWidth: "80px" }}>
                        <span style={{ fontWeight: 600 }}>
                          {stats.in_progress}
                        </span>{" "}
                        in progress
                      </span>
                    </Group>
                    <Progress
                      value={
                        stats.total > 0
                          ? (stats.in_progress / stats.total) * 100
                          : 0
                      }
                      color="blue"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Group gap="xs" mb={4}>
                      <span style={{ fontSize: "0.875rem", minWidth: "60px" }}>
                        <span style={{ fontWeight: 600 }}>{stats.done}</span>{" "}
                        done
                      </span>
                    </Group>
                    <Progress
                      value={
                        stats.total > 0 ? (stats.done / stats.total) * 100 : 0
                      }
                      color="green"
                      size="sm"
                    />
                  </div>

                  {/* Hints section */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-primary)",
                      paddingTop: "0.75rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <Stack gap="xs">
                      <Group gap="xs">
                        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                          ⌨️ Right-click issues for contextual actions
                        </span>
                      </Group>
                    </Stack>
                  </div>
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
                onClick={handleToggleAllSubtasks}
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
                      transform: issues
                        .filter((i) => !i.parent_id && i.subtask_count > 0)
                        .every((i) => expandedIssues.has(i.id))
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                }
                style={{ marginLeft: "1rem" }}
              >
                <span className="subtask-toggle-text-mobile">
                  {issues
                    .filter((i) => !i.parent_id && i.subtask_count > 0)
                    .every((i) => expandedIssues.has(i.id))
                    ? "Subtasks"
                    : "Subtasks"}
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Board */}
        <main className="main">
          <div className="board">
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                issues={issuesByStatus[column.status]}
                users={users}
                onIssueClick={setSelectedIssue}
                onAddClick={() => {
                  setCreateStatus(column.status);
                  setShowCreateModal(true);
                }}
                onDrop={handleStatusChange}
                onStatusChange={handleStatusChange}
                onUpdateIssue={handleUpdateIssue}
                onDeleteIssue={handleDeleteIssue}
                onSubtaskChange={handleSubtaskChange}
                expandedIssues={expandedIssues}
                subtasksCache={subtasksCache}
                onToggleSubtasks={handleToggleSubtasks}
                onRequestAddSubtask={(issue) => {
                  setAutoShowSubtaskForm(true);
                  setSelectedIssue(issue);
                }}
                isTouchDevice={isTouchDevice}
              />
            ))}
          </div>
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
            </div>
            <div className="footer-divider">•</div>
            <div className="footer-section">
              <span className="footer-label">UI with</span>
              <a
                href="https://mantine.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <svg className="footer-icon" viewBox="0 0 163 163" fill="none">
                  <path
                    fill="#339AF0"
                    d="M162.162 81.5c0-45.011-36.301-81.5-81.08-81.5C36.301 0 0 36.489 0 81.5 0 126.51 36.301 163 81.081 163s81.081-36.49 81.081-81.5z"
                  />
                  <path
                    fill="#fff"
                    d="M65.983 43.049a6.234 6.234 0 00-.336 6.884 6.14 6.14 0 001.618 1.786c9.444 7.036 14.866 17.794 14.866 29.52 0 11.726-5.422 22.484-14.866 29.52a6.145 6.145 0 00-1.616 1.786 6.21 6.21 0 00-.694 4.693 6.21 6.21 0 001.028 2.186 6.151 6.151 0 006.457 2.319 6.154 6.154 0 002.177-1.035 50.083 50.083 0 007.947-7.39h17.493c3.406 0 6.174-2.772 6.174-6.194s-2.762-6.194-6.174-6.194h-9.655a49.165 49.165 0 004.071-19.69 49.167 49.167 0 00-4.07-19.692h9.66c3.406 0 6.173-2.771 6.173-6.194 0-3.422-2.762-6.193-6.173-6.193H82.574a50.112 50.112 0 00-7.952-7.397 6.15 6.15 0 00-4.578-1.153 6.189 6.189 0 00-4.055 2.438h-.006z"
                  />
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M56.236 79.391a9.342 9.342 0 01.632-3.608 9.262 9.262 0 011.967-3.077 9.143 9.143 0 012.994-2.063 9.06 9.06 0 017.103 0 9.145 9.145 0 012.995 2.063 9.262 9.262 0 011.967 3.077 9.339 9.339 0 01-2.125 10.003 9.094 9.094 0 01-6.388 2.63 9.094 9.094 0 01-6.39-2.63 9.3 9.3 0 01-2.755-6.395z"
                    clipRule="evenodd"
                  />
                </svg>
                Mantine
              </a>
            </div>
            <div className="footer-divider">•</div>
            <div className="footer-section">
              <span className="footer-label">Hosted on</span>
              <a
                href="https://render.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Render
              </a>
            </div>
            <div className="footer-divider">•</div>
            <div className="footer-section">
              <span className="footer-label">DB on</span>
              <a
                href="https://turso.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Turso
              </a>
            </div>
            <div className="footer-divider">•</div>
            <div className="footer-section">
              <span className="footer-version">v{version}</span>
            </div>
          </div>
        </footer>

        {/* Create Modal */}
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
      </div>
    </ContextMenuProvider>
  );
}

// ============================================================================
// COLUMN COMPONENT
// ============================================================================

function Column({
  column,
  issues,
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
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const issueId = e.dataTransfer.getData("issueId");
    if (issueId) {
      onDrop(parseInt(issueId), column.status);
    }
  }

  return (
    <div
      className={`column ${dragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title">
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                column.status === "todo"
                  ? "#71717a"
                  : column.status === "in_progress"
                  ? "#3b82f6"
                  : "#22c55e",
            }}
          />
          {column.title}
        </div>
        <span className="column-count">{issues.length}</span>
      </div>
      <div className="column-content">
        {issues.length === 0 ? (
          <div className="empty-column">Drop issues here</div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              users={users}
              onClick={onIssueClick}
              onStatusChange={onStatusChange}
              onUpdateIssue={onUpdateIssue}
              onDeleteIssue={onDeleteIssue}
              onSubtaskChange={onSubtaskChange}
              isExpanded={expandedIssues.has(issue.id)}
              subtasks={subtasksCache[issue.id] || []}
              onToggleSubtasks={onToggleSubtasks}
              onRequestAddSubtask={onRequestAddSubtask}
              isTouchDevice={isTouchDevice}
            />
          ))
        )}
      </div>
      <button className="add-issue-btn" onClick={onAddClick}>
        + Add {column.title}
      </button>
    </div>
  );
}

// ============================================================================
// ISSUE CARD COMPONENT
// ============================================================================

function IssueCard({
  issue,
  users,
  onClick,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
  onSubtaskChange,
  isExpanded,
  subtasks,
  onToggleSubtasks,
  onRequestAddSubtask,
  isTouchDevice,
}) {
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleContextMenu = useIssueContextMenu({
    issue,
    users,
    isTouchDevice,
    onViewDetails: onClick,
    onStatusChange,
    onUpdateIssue,
    onDeleteIssue,
    onRequestAddSubtask,
  });

  function handleDragStart(e) {
    setDragging(true);
    e.dataTransfer.setData("issueId", issue.id.toString());
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragging(false);
  }

  const hasSubtasks = issue.subtask_count > 0;

  function handleSubtaskBadgeClick(e) {
    e.stopPropagation();
    onToggleSubtasks(issue.id);
  }

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <Paper
        data-issue-card
        className={dragging ? "dragging" : ""}
        onClick={() => onClick(issue)}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        p="md"
        withBorder
        style={{
          cursor: "pointer",
          transition: "all 0.2s ease",
          backgroundColor: hovering ? "var(--bg-hover)" : undefined,
          transform: hovering ? "translateY(-2px)" : undefined,
          boxShadow: hovering ? "0 4px 8px rgba(0, 0, 0, 0.3)" : undefined,
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" gap="xs">
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {issue.key}
            </div>
          </Group>
          <div
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.4,
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {issue.title}
          </div>
          {issue.description && (
            <div
              style={{
                fontSize: "0.75rem",
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {issue.description}
            </div>
          )}
          <Group justify="space-between" mt="xs">
            <Group gap="xs">
              <Badge
                color={getPriorityColor(issue.priority)}
                size="sm"
                variant="light"
              >
                {issue.priority}
              </Badge>
              {/* Subtask progress indicator - now clickable */}
              {hasSubtasks && (
                <Tooltip
                  label={
                    isExpanded
                      ? "Click to collapse subtasks"
                      : `${issue.subtask_done_count} of ${issue.subtask_count} subtasks done - Click to expand`
                  }
                >
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      issue.subtask_done_count === issue.subtask_count
                        ? "green"
                        : "blue"
                    }
                    style={{ cursor: "pointer" }}
                    onClick={handleSubtaskBadgeClick}
                  >
                    {isExpanded ? "▼" : "▶"} {issue.subtask_done_count}/
                    {issue.subtask_count}
                  </Badge>
                </Tooltip>
              )}
            </Group>
            {issue.assignee_name ? (
              <Avatar
                color={issue.assignee_color}
                name={issue.assignee_name}
                size="sm"
                title={issue.assignee_name}
                variant="filled"
              />
            ) : (
              <UnassignedAvatar size="sm" />
            )}
          </Group>
        </Stack>
      </Paper>

      {/* Expanded subtasks */}
      {hasSubtasks && (
        <Collapse in={isExpanded}>
          <div className="subtasks-container">
            {subtasks.map((subtask) => (
              <SubtaskCardInline
                key={subtask.id}
                subtask={subtask}
                users={users}
                isTouchDevice={isTouchDevice}
                onClick={onClick}
                onStatusChange={onStatusChange}
                onUpdateIssue={onUpdateIssue}
                onDeleteIssue={onDeleteIssue}
              />
            ))}
          </div>
        </Collapse>
      )}
    </div>
  );
}

// ============================================================================
// SUBTASK CARD INLINE (for expanded view in issue cards)
// ============================================================================

function SubtaskCardInline({
  subtask,
  users,
  isTouchDevice,
  onClick,
  onStatusChange,
  onUpdateIssue,
  onDeleteIssue,
}) {
  const handleContextMenu = useIssueContextMenu({
    issue: subtask,
    users,
    isTouchDevice,
    onViewDetails: onClick,
    onStatusChange,
    onUpdateIssue,
    onDeleteIssue,
    onRequestAddSubtask: null, // Subtasks can't have subtasks
  });

  const handleCheckboxToggle = async (e) => {
    e.stopPropagation();
    const isDone = subtask.status === "done";

    if (isDone) {
      // Unchecking: restore to previous status or default to todo
      const newStatus = subtask.previous_status || "todo";
      await onUpdateIssue(subtask.id, { status: newStatus });
    } else {
      // Checking: mark as done
      await onUpdateIssue(subtask.id, { status: "done" });
    }
  };

  return (
    <div className="subtask-item">
      <div className="subtask-connector" />
      <Paper
        p="sm"
        withBorder
        className="subtask-card"
        style={{
          cursor: "pointer",
          backgroundColor: "var(--bg-tertiary)",
          borderLeft:
            subtask.status === "done"
              ? "10px solid var(--mantine-color-green-6)"
              : subtask.status === "in_progress"
              ? "6px solid var(--mantine-color-blue-6)"
              : "3px solid var(--mantine-color-gray-6)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(subtask);
        }}
        onContextMenu={handleContextMenu}
      >
        <Stack gap="xs">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Checkbox
                checked={subtask.status === "done"}
                onChange={handleCheckboxToggle}
                onClick={(e) => e.stopPropagation()}
                size="sm"
                styles={{ input: { cursor: "pointer" } }}
              />
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {subtask.key}
              </div>
            </Group>
            <Badge
              size="xs"
              variant="dot"
              color={getStatusColor(subtask.status)}
            >
              {subtask.status === "done"
                ? "Done"
                : subtask.status === "in_progress"
                ? "In Progress"
                : "To Do"}
            </Badge>
          </Group>
          <div
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.3,
              textDecoration:
                subtask.status === "done" ? "line-through" : "none",
              opacity: subtask.status === "done" ? 0.7 : 1,
            }}
          >
            {subtask.title}
          </div>
          {subtask.description && (
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {subtask.description}
            </div>
          )}
          <Group justify="space-between" gap="xs">
            <Badge
              color={getPriorityColor(subtask.priority)}
              size="xs"
              variant="light"
            >
              {subtask.priority}
            </Badge>
            {subtask.assignee_name ? (
              <Avatar
                color={subtask.assignee_color}
                name={subtask.assignee_name}
                size="sm"
                title={subtask.assignee_name}
              />
            ) : (
              <UnassignedAvatar size="sm" />
            )}
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}

// ============================================================================
// CREATE ISSUE MODAL
// ============================================================================

function CreateIssueModal({
  users,
  currentUserId,
  createStatus,
  onClose,
  onCreate,
  parentIssue = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(createStatus);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [shake, setShake] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [flashStatus, setFlashStatus] = useState(true);

  const isDirty = title.trim() || description.trim();
  const isSubtask = !!parentIssue;

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee_id: assigneeId || null,
      reporter_id: currentUserId || null,
      parent_id: parentIssue?.id || null,
    });
  }

  function handleOverlayClick() {
    if (isDirty) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      onClose();
    }
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmingCancel(true);
    } else {
      onClose();
    }
  }

  function handleConfirmCancel() {
    setConfirmingCancel(false);
    onClose();
  }

  return (
    <Modal
      opened={true}
      onClose={() => {
        if (isDirty) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        } else {
          onClose();
        }
      }}
      withCloseButton={true}
      title={
        isSubtask ? `Create Subtask for ${parentIssue.key}` : "Create Issue"
      }
      classNames={{ content: shake ? "shake" : "" }}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          data-autofocus
          mb="md"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          autosize
          minRows={2}
          mb="md"
        />
        <Group grow mb="md">
          <Select
            label="Status"
            value={status}
            onChange={(value) => setStatus(value)}
            data={[
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(value) => setPriority(value)}
            data={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </Group>

        <Select
          label="Assignee"
          value={assigneeId}
          onChange={(value) => setAssigneeId(value || "")}
          placeholder="Unassigned"
          clearable
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
          mb="md"
        />
        <Group justify="flex-end" mt="xl">
          {!isDirty || !confirmingCancel ? (
            <>
              <Button variant="default" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {isSubtask ? "Create Subtask" : "Create Issue"}
              </Button>
            </>
          ) : (
            <>
              <span
                style={{ marginRight: "auto", color: "var(--text-secondary)" }}
              >
                Discard changes?
              </span>
              <Button
                variant="light"
                color="orange"
                type="button"
                onClick={handleConfirmCancel}
              >
                Yes, Discard
              </Button>
              <Button
                variant="filled"
                type="button"
                onClick={() => setConfirmingCancel(false)}
              >
                Keep Editing
              </Button>
            </>
          )}
        </Group>
      </form>
    </Modal>
  );
}

// ============================================================================
// SUBTASK ROW COMPONENT (for SubtasksSection in modal)
// ============================================================================

function SubtaskRow({
  subtask,
  users,
  onStatusToggle,
  onClick,
  onUpdate,
  onDelete,
  isTouchDevice,
}) {
  const handleContextMenu = useIssueContextMenu({
    issue: subtask,
    users,
    isTouchDevice,
    onViewDetails: () => onClick(),
    onStatusChange: onStatusToggle,
    onUpdateIssue: onUpdate,
    onDeleteIssue: onDelete,
    onRequestAddSubtask: null,
  });

  return (
    <Group
      gap="sm"
      p="xs"
      style={{
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
      }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <Checkbox
        checked={subtask.status === "done"}
        onChange={(e) => {
          e.stopPropagation();
          const isDone = e.currentTarget.checked;
          if (isDone) {
            // Checking: mark as done
            onStatusToggle(subtask.id, "done");
          } else {
            // Unchecking: restore to previous status or default to todo
            const newStatus = subtask.previous_status || "todo";
            onStatusToggle(subtask.id, newStatus);
          }
        }}
        size="sm"
        onClick={(e) => e.stopPropagation()}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            marginBottom: "2px",
          }}
        >
          {subtask.key}
        </div>
        <div
          style={{
            textDecoration: subtask.status === "done" ? "line-through" : "none",
            color:
              subtask.status === "done" ? "var(--text-secondary)" : "inherit",
            fontSize: "0.875rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtask.title}
        </div>
        {subtask.description && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: "4px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtask.description}
          </div>
        )}
      </div>
      <Badge
        size="xs"
        variant="light"
        color={getPriorityColor(subtask.priority)}
      >
        {subtask.priority}
      </Badge>
      {subtask.assignee_name ? (
        <Tooltip label={subtask.assignee_name}>
          <Avatar
            color={subtask.assignee_color}
            name={subtask.assignee_name}
            size="sm"
          />
        </Tooltip>
      ) : (
        <UnassignedAvatar size="sm" />
      )}
    </Group>
  );
}

// ============================================================================
// SUBTASKS SECTION COMPONENT
// ============================================================================

function SubtasksSection({
  parentIssue,
  users,
  currentUserId,
  onViewIssue,
  onSubtaskChange,
  autoShowSubtaskForm,
  onSubtaskFormShown,
  isTouchDevice,
}) {
  const [subtasks, setSubtasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtasks();
  }, [parentIssue.id]);

  // Auto-show the form when requested via context menu
  useEffect(() => {
    if (autoShowSubtaskForm && !showAddForm) {
      setShowAddForm(true);
      onSubtaskFormShown?.();
    }
  }, [autoShowSubtaskForm, showAddForm, onSubtaskFormShown]);

  async function loadSubtasks() {
    setLoading(true);
    const data = await api.get(`/issues/${parentIssue.id}/subtasks`);
    setSubtasks(data);
    setLoading(false);
  }

  async function handleCreateSubtask() {
    if (!newTitle.trim()) return;

    const newSubtask = await api.post("/issues", {
      title: newTitle.trim(),
      parent_id: parentIssue.id,
      status: "todo",
      priority: newPriority,
      assignee_id: newAssignee || null,
      reporter_id: currentUserId,
    });

    setSubtasks([...subtasks, newSubtask]);
    setNewTitle("");
    setNewAssignee("");
    setNewPriority("medium");
    setShowAddForm(false);
    onSubtaskChange?.(parentIssue.id); // Pass parent ID to expand it

    notifications.show({
      title: "Subtask created",
      message: `${newSubtask.key} has been added`,
      color: "green",
    });
  }

  async function handleStatusToggle(subtaskId, newStatus) {
    const updated = await api.patch(`/issues/${subtaskId}`, {
      status: newStatus,
    });
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s))
    );
    onSubtaskChange?.();
  }

  async function handleUpdate(subtaskId, data) {
    const updated = await api.patch(`/issues/${subtaskId}`, data);
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s))
    );
    onSubtaskChange?.();
  }

  async function handleDelete(subtaskId) {
    await api.delete(`/issues/${subtaskId}`);
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    onSubtaskChange?.();
    notifications.show({
      title: "Subtask deleted",
      message: "The subtask has been removed",
      color: "red",
    });
  }

  const doneCount = subtasks.filter((s) => s.status === "done").length;

  if (loading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <div>
      <Group justify="space-between" mb="sm">
        <h3
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          Subtasks
          <Badge size="sm" variant="light" color="gray">
            {doneCount}/{subtasks.length}
          </Badge>
        </h3>
        {!showAddForm && (
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setShowAddForm(true)}
          >
            + Add Subtask
          </Button>
        )}
      </Group>

      {subtasks.length > 0 && (
        <Progress
          value={subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0}
          size="sm"
          mb="sm"
          color="green"
          animated={doneCount < subtasks.length}
        />
      )}

      <Stack gap="xs">
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            users={users}
            onStatusToggle={handleStatusToggle}
            onClick={() => onViewIssue(subtask.id)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            isTouchDevice={isTouchDevice}
          />
        ))}
      </Stack>

      {subtasks.length === 0 && !showAddForm && (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: "4px",
          }}
        >
          No subtasks yet. Click "+ Add Subtask" to break this issue down.
        </div>
      )}

      {showAddForm && (
        <Paper p="sm" mt="sm" withBorder>
          <TextInput
            placeholder="Subtask title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                handleCreateSubtask();
              } else if (e.key === "Escape") {
                setShowAddForm(false);
                setNewTitle("");
              }
            }}
            mb="sm"
            autoFocus
          />
          <Group gap="sm">
            <Select
              placeholder="Assignee"
              value={newAssignee}
              onChange={(value) => setNewAssignee(value || "")}
              data={users.map((u) => ({
                value: u.id.toString(),
                label: u.name,
              }))}
              clearable
              size="sm"
              style={{ flex: 1 }}
            />
            <Select
              value={newPriority}
              onChange={(value) => setNewPriority(value)}
              data={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              size="sm"
              style={{ width: "110px" }}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
                setNewAssignee("");
                setNewPriority("medium");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubtask}
              disabled={!newTitle.trim()}
            >
              Add Subtask
            </Button>
          </Group>
        </Paper>
      )}
    </div>
  );
}

// ============================================================================
// ISSUE DETAIL MODAL
// ============================================================================

function IssueDetailModal({
  issue,
  users,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onViewIssue,
  onSubtaskChange,
  autoShowSubtaskForm,
  onSubtaskFormShown,
  isTouchDevice,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || "");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [shake, setShake] = useState(false);
  const [fieldToFocus, setFieldToFocus] = useState(null);

  const isEditDirty =
    editing &&
    (title !== issue.title || description !== (issue.description || ""));

  const isSubtask = !!issue.parent_id;

  // Reset state when issue changes (for subtask navigation)
  useEffect(() => {
    setTitle(issue.title);
    setDescription(issue.description || "");
    setEditing(false);
    setConfirmingDelete(false);
    setConfirmingCancel(false);
  }, [issue.id]);

  useEffect(() => {
    loadComments();
  }, [issue.id]);

  // Focus the appropriate field when entering edit mode
  useEffect(() => {
    if (editing && fieldToFocus) {
      const focusTextarea = () => {
        const modal = document.querySelector(".mantine-Modal-content");
        if (modal) {
          const textareas = modal.querySelectorAll("textarea");
          const textarea =
            fieldToFocus === "title" ? textareas[0] : textareas[1];
          if (textarea) {
            textarea.focus();
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
            return true;
          }
        }
        return false;
      };

      if (!focusTextarea()) {
        requestAnimationFrame(() => {
          if (!focusTextarea()) {
            requestAnimationFrame(() => {
              focusTextarea();
            });
          }
        });
      }

      setFieldToFocus(null);
    }
  }, [editing, fieldToFocus]);

  async function loadComments() {
    const data = await api.get(`/issues/${issue.id}/comments`);
    setComments(data);
  }

  async function handleSave() {
    await onUpdate(issue.id, { title, description });
    setEditing(false);
    notifications.show({
      title: "Issue updated",
      message: "Your changes have been saved",
      color: "green",
    });
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    await api.post(`/issues/${issue.id}/comments`, {
      body: newComment.trim(),
      user_id: currentUserId || null,
    });
    setNewComment("");
    loadComments();
  }

  function handleOverlayClick() {
    if (isEditDirty) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      onClose();
    }
  }

  function handleCancelEdit() {
    setTitle(issue.title);
    setDescription(issue.description || "");
    setEditing(false);
    setConfirmingCancel(false);
  }

  return (
    <Modal
      opened={true}
      onClose={() => {
        if (isEditDirty) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        } else {
          onClose();
        }
      }}
      title={
        <Group gap="xs">
          {issue.key}
          {isSubtask && (
            <Badge size="sm" variant="light" color="blue">
              Subtask
            </Badge>
          )}
        </Group>
      }
      withCloseButton={true}
      classNames={{ content: shake ? "shake" : "" }}
      size="lg"
    >
      {/* Parent issue link for subtasks */}
      {isSubtask && issue.parent_key && (
        <Button
          variant="subtle"
          size="xs"
          mb="md"
          onClick={() => onViewIssue(issue.parent_id)}
          style={{ marginLeft: "-0.5rem" }}
        >
          ← Back to {issue.parent_key}
        </Button>
      )}

      {editing ? (
        // Editing mode - editable inputs
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
                      handleCancelEdit();
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button variant="filled" onClick={handleSave}>
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
                <Button
                  variant="light"
                  color="orange"
                  onClick={handleCancelEdit}
                >
                  Yes, Discard
                </Button>
                <Button
                  variant="filled"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep Editing
                </Button>
              </>
            )}
          </Group>
        </>
      ) : (
        // View mode - show as text with clickable links
        <>
          <div
            style={{
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={() => {
              setFieldToFocus("title");
              setEditing(true);
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
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
                borderRadius: "4px",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {issue.title}
            </div>
          </div>
          <div
            style={{
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={(e) => {
              if (e.target.tagName !== "A") {
                setFieldToFocus("description");
                setEditing(true);
              }
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
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
                borderRadius: "4px",
                minHeight: "60px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                color: issue.description ? "inherit" : "var(--text-muted)",
              }}
            >
              {issue.description
                ? linkifyText(issue.description).map((part, index) =>
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
      )}

      {/* Meta fields - using same layout as CreateIssueModal */}
      <Group grow mb="md">
        <Select
          label="Status"
          value={issue.status}
          onChange={(value) => onStatusChange(issue.id, value)}
          data={[
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "done", label: "Done" },
          ]}
        />
        <Select
          label="Priority"
          value={issue.priority}
          onChange={(value) => onUpdate(issue.id, { priority: value })}
          data={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </Group>

      <Group grow mb="md">
        <Select
          label="Assignee"
          value={issue.assignee_id?.toString() || null}
          onChange={(value) =>
            onUpdate(issue.id, {
              assignee_id: value ? parseInt(value) : null,
            })
          }
          placeholder="Unassigned"
          clearable
          searchable
          selectFirstOptionOnChange
          autoSelectOnBlur
          onFocus={(event) => event.currentTarget.select()}
          renderOption={({ option }) => (
            <Group gap="xs">
              {option.value === issue.assignee_id?.toString() && (
                <IconCheck size={16} />
              )}
              <span>{option.label}</span>
            </Group>
          )}
          data={users.map((user) => ({
            value: user.id.toString(),
            label: user.name,
          }))}
        />
        <TextInput
          label="Created"
          value={formatDate(issue.created_at)}
          readOnly
          variant="filled"
          styles={{
            input: { cursor: "default" },
          }}
        />
      </Group>

      {/* Subtasks Section - only show for parent issues */}
      {!isSubtask && (
        <div
          style={{
            marginTop: "1.5rem",
            marginBottom: "1.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          <SubtasksSection
            parentIssue={issue}
            users={users}
            currentUserId={currentUserId}
            onViewIssue={onViewIssue}
            onSubtaskChange={onSubtaskChange}
            autoShowSubtaskForm={autoShowSubtaskForm}
            onSubtaskFormShown={onSubtaskFormShown}
            isTouchDevice={isTouchDevice}
          />
        </div>
      )}

      {/* Comments */}
      <h3
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
        }}
      >
        Comments ({comments.length})
      </h3>

      <Stack gap="sm">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <Avatar
                color={comment.user_color || "gray"}
                name={comment.user_name || "Anonymous"}
                size="sm"
              />
              <span className="comment-author">
                {comment.user_name || "Anonymous"}
              </span>
              <span className="comment-time">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <div className="comment-body">
              {linkifyText(comment.body).map((part, index) =>
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
          </div>
        ))}
      </Stack>

      {/* Comment form */}
      <Group gap="sm" mt="md" align="flex-start">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && handleAddComment()
          }
          autosize
          minRows={1}
          style={{ flex: 1 }}
        />
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
          Send
        </Button>
      </Group>

      {/* Delete button */}
      <Group
        justify="flex-start"
        mt="xl"
        pt="md"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {!confirmingDelete ? (
          <Button
            variant="light"
            color="red"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete {isSubtask ? "Subtask" : "Issue"}
          </Button>
        ) : (
          <>
            <span
              style={{
                marginRight: "auto",
                color: "var(--mantine-color-dimmed)",
              }}
            >
              Are you sure?
            </span>
            <Button
              variant="filled"
              color="red"
              onClick={() => onDelete(issue.id)}
            >
              Yes, Delete
            </Button>
            <Button
              variant="default"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </Group>
    </Modal>
  );
}

export default App;
