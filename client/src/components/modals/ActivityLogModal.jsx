import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Modal, Skeleton, Stack } from "@mantine/core";
import { api } from "../../utils/api";
import { notifyApiError } from "../../utils/notify";
import {
  formatActivityDescription,
  relativeTime,
} from "../../utils/formatters.jsx";

function ActivityEntrySkeleton() {
  return (
    <div className="activity-entry">
      <div className="activity-header">
        <Skeleton height={28} width={28} circle />
        <Skeleton height={14} width={100} radius="sm" />
        <Skeleton height={12} width={60} radius="sm" ml="auto" />
      </div>
      <div className="activity-body" style={{ marginTop: "8px" }}>
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
    <Modal opened={opened} onClose={onClose} size="lg" title="Recent Activity">
      {loading ? (
        <Stack gap="sm">
          <ActivityEntrySkeleton />
          <ActivityEntrySkeleton />
          <ActivityEntrySkeleton />
        </Stack>
      ) : activities.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "var(--text-secondary)",
          }}
        >
          No recent activity
        </div>
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
                    <Badge
                      variant="light"
                      size="sm"
                      style={{ cursor: entry.issue_id ? "pointer" : "default" }}
                      onClick={() => {
                        if (entry.issue_id) {
                          onViewIssue(entry.issue_id);
                          onClose();
                        }
                      }}
                    >
                      {entry.issue_key}
                    </Badge>
                    {entry.issue_title && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          color: "var(--text-secondary)",
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
              size="sm"
              fullWidth
              onClick={() => fetchActivities(true)}
              loading={loadingMore}
              disabled={loadingMore}
              style={{ marginTop: "1rem" }}
            >
              Load More
            </Button>
          )}
          {!hasMore && (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
              }}
            >
              No more activity
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
