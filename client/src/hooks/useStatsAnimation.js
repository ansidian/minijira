import { useEffect, useRef } from "react";

export function useStatsAnimation({ stats, setStatsBadgeAnimate }) {
  const previousStatsRef = useRef(null);

  useEffect(() => {
    if (!stats) return;

    const previousStats = previousStatsRef.current;

    if (!previousStats) {
      previousStatsRef.current = { ...stats };
      return;
    }

    const hasChanged =
      previousStats.todo !== stats.todo ||
      previousStats.in_progress !== stats.in_progress ||
      previousStats.review !== stats.review ||
      previousStats.done !== stats.done;

    if (hasChanged) {
      previousStatsRef.current = { ...stats };

      // trigger animation
      setStatsBadgeAnimate(true);
      const timer = setTimeout(() => setStatsBadgeAnimate(false), 300);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [stats, setStatsBadgeAnimate]);
}
