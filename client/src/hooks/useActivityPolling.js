import { useEffect } from "react";
import { api } from "../utils/api";

export function useActivityPolling({ showActivityLog, setHasNewActivity }) {
  useEffect(() => {
    async function checkNewActivity() {
      try {
        const [latest] = await api.get("/activity?limit=1");
        if (latest) {
          const lastViewed = localStorage.getItem("minijira_activity_viewed");
          if (!lastViewed || new Date(latest.created_at) > new Date(lastViewed)) {
            setHasNewActivity(true);
          }
        }
      } catch (error) {
        console.error("Failed to check activity:", error);
      }
    }

    checkNewActivity();
  }, [setHasNewActivity]);

  useEffect(() => {
    if (showActivityLog) {
      setHasNewActivity(false);
      api.get("/activity?limit=1").then(([latest]) => {
        if (latest) {
          localStorage.setItem("minijira_activity_viewed", latest.created_at);
        }
      });
    }
  }, [showActivityLog, setHasNewActivity]);
}
