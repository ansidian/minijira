import { useEffect, useState } from "react";
import { Avatar, Button, Modal, Skeleton, Stack } from "@mantine/core";
import { api } from "../../utils/api";
import { notifyApiError } from "../../utils/notify";
import {
  formatActivityDescription,
  relativeTime,
} from "../../utils/formatters.jsx";

function ActivityEntrySkeleton() {
  return (
    <div className="activity-entry skeleton-animate">
      <div className="activity-header">
        <Skeleton height={28} width={28} circle />
        <Skeleton height={14} width={100} radius="sm" />
        <Skeleton height={12} width={60} radius="sm" ml="auto" />
      </div>
      <div className="activity-body">
        <Skeleton height={14} width="80%" radius="sm" />
      </div>
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
    }, 60000); // 60 seconds

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

      // API returns { activities, nextCursor, hasMore }
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
      title={<span className="modal-header-key">Recent Activity</span>}
    >
      {loading ? (
        <Stack gap="sm">
          <ActivityEntrySkeleton />
          <ActivityEntrySkeleton />
          <ActivityEntrySkeleton />
        </Stack>
      ) : activities.length === 0 ? (
        <div className="empty-state">No recent activity</div>
      ) : (
        <>
          <Stack gap="sm">
            {activities.map((entry) => (
              <div key={entry.id} className="activity-entry">
                <div className="activity-header">
                  <Avatar
                    color={entry.user_color}
                    name={entry.user_name || "System"}
                    size="sm"
                  />
                  <span className="activity-author">
                    {entry.user_name || "System"}
                  </span>
                  <span className="activity-time">
                    {relativeTime(entry.created_at)}
                  </span>
                </div>
                <div className="activity-body">
                  <span className="activity-description">
                    {formatActivityDescription(entry)}{" "}
                    <button
                      className="issue-key-badge"
                      onClick={() => {
                        if (entry.issue_id) {
                          onViewIssue(entry.issue_id);
                          onClose();
                        }
                      }}
                      disabled={!entry.issue_id}
                      style={{
                        cursor: entry.issue_id ? "pointer" : "default",
                        opacity: entry.issue_id ? 1 : 0.6,
                      }}
                    >
                      {entry.issue_key}
                    </button>
                    {entry.issue_title && (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {entry.issue_title}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </Stack>

          {hasMore && (
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              fullWidth
              onClick={() => fetchActivities(true)}
              loading={loadingMore}
              disabled={loadingMore}
              style={{ marginTop: "16px" }}
            >
              Load More
            </Button>
          )}

          {!hasMore && activities.length > 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
                fontFamily: "var(--font-mono)",
              }}
            >
              End of activity log
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
