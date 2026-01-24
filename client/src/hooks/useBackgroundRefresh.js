import { useEffect, useRef } from "react";

/**
 * Triggers a refresh when user returns to tab after inactivity.
 * Refresh is silent - no loading indicators shown.
 *
 * @param {Function} refreshFn - Function to call for refresh (should be loadData)
 * @param {number} inactivityThreshold - Milliseconds of inactivity before refresh (default: 30000)
 */
export function useBackgroundRefresh(refreshFn, inactivityThreshold = 30000) {
  const lastVisibleTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const inactiveDuration = Date.now() - lastVisibleTimeRef.current;

        if (inactiveDuration >= inactivityThreshold) {
          // Silent refresh - don't set loading state
          refreshFn({ silent: true });
        }
      } else {
        // Tab hidden - record time
        lastVisibleTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshFn, inactivityThreshold]);
}
