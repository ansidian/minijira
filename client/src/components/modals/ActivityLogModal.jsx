import { useEffect, useState } from "react";
import { Avatar, Badge, Modal, Stack } from "@mantine/core";
import { api } from "../../utils/api";
import { notifyApiError } from "../../utils/notify";
import {
  formatActivityDescription,
  relativeTime,
} from "../../utils/formatters.jsx";

export function ActivityLogModal({ opened, onClose, onViewIssue }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (opened) {
      fetchActivities();
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

  async function fetchActivities() {
    setLoading(true);
    try {
      const data = await api.get("/activity?limit=20");
      setActivities(data);
    } catch (error) {
      notifyApiError({
        error,
        operation: "load activity log"
      });
    }
    setLoading(false);
  }

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title="Recent Activity">
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "var(--text-secondary)",
          }}
        >
          Loading...
        </div>
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
      )}
    </Modal>
  );
}
