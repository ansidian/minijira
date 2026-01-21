import { useEffect } from "react";

export function useStatsAnimation({
  stats,
  previousStats,
  setPreviousStats,
  setStatsBadgeAnimate,
}) {
  useEffect(() => {
    if (!previousStats) {
      setPreviousStats(stats);
      return;
    }

    const hasChanged =
      previousStats.todo !== stats.todo ||
      previousStats.in_progress !== stats.in_progress ||
      previousStats.review !== stats.review ||
      previousStats.done !== stats.done;

    if (hasChanged) {
      setPreviousStats(stats);
      setStatsBadgeAnimate(true);
      const timer = setTimeout(() => setStatsBadgeAnimate(false), 300);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [
    previousStats,
    setPreviousStats,
    setStatsBadgeAnimate,
    stats,
  ]);
}
