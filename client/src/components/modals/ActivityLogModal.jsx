import { useEffect, useState, useMemo } from "react";
import { Avatar, Button, Modal, Skeleton } from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconArrowRight,
  IconMessage,
  IconUser,
  IconFlag,
  IconSubtask,
} from "@tabler/icons-react";
import { api } from "../../utils/api";
import { notifyApiError } from "../../utils/notify";
import { formatDate, relativeTime } from "../../utils/formatters.jsx";

// Maps action types to their visual treatment
const ACTION_CONFIG = {
  issue_created: {
    icon: IconPlus,
    color: "var(--status-done)",
    label: "created",
  },
  subtask_created: {
    icon: IconSubtask,
    color: "var(--status-done)",
    label: "created subtask on",
  },
  issue_deleted: {
    icon: IconTrash,
    color: "var(--priority-high)",
    label: "deleted",
  },
  subtask_deleted: {
    icon: IconTrash,
    color: "var(--priority-high)",
    label: "deleted subtask from",
  },
  status_changed: {
    icon: IconArrowRight,
    color: "var(--status-progress)",
    label: "moved",
  },
  assignee_changed: {
    icon: IconUser,
    color: "var(--accent)",
    label: "assigned",
  },
  priority_changed: {
    icon: IconFlag,
    color: "var(--priority-medium)",
    label: "changed priority on",
  },
  comment_added: {
    icon: IconMessage,
    color: "var(--status-review)",
    label: "commented on",
  },
};

// Format status for display
function formatStatus(status) {
  const statusMap = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };
  return statusMap[status] || status;
}

// Format priority for display
function formatPriority(priority) {
  const priorityMap = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  return priorityMap[priority] || priority;
}

// Get relative day label for grouping
function getDayGroup(dateStr) {
  const now = new Date();
  const date = new Date(dateStr.replace(" ", "T") + "Z");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  return formatDate(dateStr);
}

// Group activities by day
function groupActivitiesByDay(activities) {
  const groups = [];
  let currentGroup = null;

  for (const activity of activities) {
    const dayLabel = getDayGroup(activity.created_at);
    if (!currentGroup || currentGroup.label !== dayLabel) {
      currentGroup = { label: dayLabel, entries: [] };
      groups.push(currentGroup);
    }
    currentGroup.entries.push(activity);
  }

  return groups;
}

function ActivityEntrySkeleton({ isFirst, isLast }) {
  return (
    <div className="timeline-entry">
      <div className="timeline-connector">
        <div className={`timeline-line timeline-line-top ${isFirst ? "timeline-line-hidden" : ""}`} />
        <Skeleton height={28} width={28} circle />
        <div className={`timeline-line timeline-line-bottom ${isLast ? "timeline-line-hidden" : ""}`} />
      </div>
      <div className="timeline-content skeleton-animate">
        <div className="timeline-header">
          <Skeleton height={24} width={24} circle />
          <Skeleton height={14} width={80} radius="sm" />
          <Skeleton height={12} width={50} radius="sm" ml="auto" />
        </div>
        <div className="timeline-body">
          <Skeleton height={14} width="70%" radius="sm" />
          <Skeleton height={12} width="40%" radius="sm" mt={6} />
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ entry, onViewIssue, onClose, isFirst, isLast }) {
  const config = ACTION_CONFIG[entry.action_type] || {
    icon: IconArrowRight,
    color: "var(--text-muted)",
    label: entry.action_type?.replace(/_/g, " ") || "updated",
  };
  const Icon = config.icon;

  // Build the action description
  let actionDetail = null;
  if (entry.action_type === "status_changed") {
    actionDetail = (
      <span className="timeline-detail">
        <span className="timeline-value">{formatStatus(entry.old_value)}</span>
        <IconArrowRight size={12} className="timeline-arrow" />
        <span className="timeline-value">{formatStatus(entry.new_value)}</span>
      </span>
    );
  } else if (entry.action_type === "priority_changed") {
    actionDetail = (
      <span className="timeline-detail">
        <span className="timeline-value">{formatPriority(entry.old_value)}</span>
        <IconArrowRight size={12} className="timeline-arrow" />
        <span className="timeline-value">{formatPriority(entry.new_value)}</span>
      </span>
    );
  }

  return (
    <div className="timeline-entry">
      <div className="timeline-connector">
        <div className={`timeline-line timeline-line-top ${isFirst ? "timeline-line-hidden" : ""}`} />
        <div
          className="timeline-node"
          style={{ "--node-color": config.color }}
        >
          <Icon size={14} />
        </div>
        <div className={`timeline-line timeline-line-bottom ${isLast ? "timeline-line-hidden" : ""}`} />
      </div>
      <div className="timeline-content">
        <div className="timeline-header">
          <Avatar
            color={entry.user_color}
            name={entry.user_name || "System"}
            size={24}
          />
          <span className="timeline-author">{entry.user_name || "System"}</span>
          <span className="timeline-time">{relativeTime(entry.created_at)}</span>
        </div>
        <div className="timeline-body">
          <span className="timeline-action">{config.label}</span>
          {entry.issue_id ? (
            <button
              className="timeline-issue-key"
              onClick={() => {
                onViewIssue(entry.issue_id);
                onClose();
              }}
            >
              {entry.issue_key}
            </button>
          ) : (
            <span className="timeline-issue-key timeline-issue-key-disabled">
              {entry.issue_key}
            </span>
          )}
          {actionDetail}
        </div>
        {entry.issue_title && (
          <div className="timeline-issue-title">{entry.issue_title}</div>
        )}
      </div>
    </div>
  );
}

function DayGroupHeader({ label }) {
  return (
    <div className="timeline-day-header">
      <span className="timeline-day-label">{label}</span>
      <div className="timeline-day-line" />
    </div>
  );
}

export function ActivityLogModal({ opened, onClose, onViewIssue }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [, forceUpdate] = useState(0);

  const groupedActivities = useMemo(
    () => groupActivitiesByDay(activities),
    [activities]
  );

  useEffect(() => {
    if (opened) {
      fetchActivities(false);
    }
  }, [opened]);

  // Update relative times every 60 seconds while modal is open
  useEffect(() => {
    if (!opened) return;

    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [opened]);

  async function fetchActivities(isLoadMore = false) {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setActivities([]);
      setCursor(null);
      setHasMore(true);
    }

    try {
      const cursorParam = isLoadMore && cursor ? `&cursor=${cursor}` : "";
      const data = await api.get(`/activity?limit=20${cursorParam}`);

      if (isLoadMore) {
        setActivities((prev) => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      notifyApiError({
        error,
        operation: "load activity log",
      });
    }

    setLoading(false);
    setLoadingMore(false);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={<span className="modal-header-key">Activity</span>}
      classNames={{ body: "activity-modal-body" }}
    >
      {loading ? (
        <div className="timeline">
          <DayGroupHeader label="Today" />
          <ActivityEntrySkeleton isFirst />
          <ActivityEntrySkeleton />
          <ActivityEntrySkeleton isLast />
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-empty-state">
          <div className="activity-empty-icon">
            <IconArrowRight size={24} />
          </div>
          <p className="activity-empty-title">No activity yet</p>
          <p className="activity-empty-description">
            Actions on issues will appear here
          </p>
        </div>
      ) : (
        <div className="timeline">
          {groupedActivities.map((group, groupIndex) => (
            <div key={group.label} className="timeline-group">
              <DayGroupHeader label={group.label} />
              {group.entries.map((entry, entryIndex) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  onViewIssue={onViewIssue}
                  onClose={onClose}
                  isFirst={groupIndex === 0 && entryIndex === 0}
                  isLast={
                    groupIndex === groupedActivities.length - 1 &&
                    entryIndex === group.entries.length - 1 &&
                    !hasMore
                  }
                />
              ))}
            </div>
          ))}

          {hasMore && (
            <div className="timeline-load-more">
              <div className="timeline-load-more-line" />
              <Button
                variant="light"
                color="gray"
                size="xs"
                onClick={() => fetchActivities(true)}
                loading={loadingMore}
                disabled={loadingMore}
              >
                Load older activity
              </Button>
              <div className="timeline-load-more-line" />
            </div>
          )}

          {!hasMore && activities.length > 0 && (
            <div className="timeline-end">
              <div className="timeline-end-node" />
              <span className="timeline-end-label">Beginning of history</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
