import { useEffect } from "react";
import { api } from "../utils/api.js";

/**
 * Hook to handle deep linking from URLs like /issues/:id
 * Opens the issue detail modal if the URL path matches the pattern
 */
export function useDeepLink(setSelectedIssue) {
  useEffect(() => {
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/issues\/(\d+)$/);

    if (match) {
      const issueId = match[1];

      // Fetch the issue and open it
      api.get(`/issues/${issueId}`)
        .then((issue) => {
          setSelectedIssue(issue);
          // Replace the current history entry to avoid duplicate entries
          window.history.replaceState({}, '', pathname);
        })
        .catch((error) => {
          // Invalid ID or issue not found - just stay on board view
          console.warn(`Failed to load issue ${issueId}:`, error);
          // Navigate to root without modal
          window.history.replaceState({}, '', '/');
        });
    }
  }, [setSelectedIssue]);
}
