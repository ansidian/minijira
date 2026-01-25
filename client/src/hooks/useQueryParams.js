import { useState, useEffect, useCallback, useRef } from "react";
import { useDebouncedValue } from "@mantine/hooks";

/**
 * Syncs React state with URL query parameters.
 *
 * Features:
 * - Reads initial state from URL on mount
 * - Debounces URL updates to prevent history spam
 * - Supports array params (repeated keys like ?status=todo&status=done)
 * - Listens for browser back/forward navigation
 *
 * @param {number} debounceMs - Debounce delay for URL updates (default: 300ms)
 * @returns {[URLSearchParams, function]} - [params for reading, setParams for updating]
 *
 * @example
 * const [params, setParams] = useQueryParams();
 *
 * // Read single value
 * const status = params.get('status'); // "todo" or null
 *
 * // Read multiple values (array)
 * const statuses = params.getAll('status'); // ["todo", "done"]
 *
 * // Update params
 * setParams({ status: ['todo', 'done'], priority: 'high' });
 * // Results in: ?status=todo&status=done&priority=high
 *
 * // Clear a param
 * setParams({ status: null }); // Removes status from URL
 */
export function useQueryParams(debounceMs = 300) {
  // Internal state that tracks current params
  const [params, setParamsState] = useState(() => {
    return new URLSearchParams(window.location.search);
  });

  // Pending updates to be debounced before writing to URL
  const [pendingParams, setPendingParams] = useState(params);
  const [debouncedParams] = useDebouncedValue(pendingParams, debounceMs);

  // Track if this is the initial mount to avoid updating URL on first render
  const isInitialMount = useRef(true);

  // Sync debounced params to URL
  useEffect(() => {
    // Skip initial mount - we read from URL, don't write back
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentSearch = window.location.search;
    const newSearch = debouncedParams.toString();
    const newUrl = newSearch ? `?${newSearch}` : window.location.pathname;

    // Only update if actually different
    if (currentSearch !== (newSearch ? `?${newSearch}` : '')) {
      window.history.pushState({}, '', newUrl);
    }

    // Sync internal state with what we just pushed
    setParamsState(new URLSearchParams(debouncedParams));
  }, [debouncedParams]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newParams = new URLSearchParams(window.location.search);
      setParamsState(newParams);
      setPendingParams(newParams);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /**
   * Update URL params. Merges with existing params.
   *
   * @param {Object} updates - Object with param updates
   *   - String value: sets single param
   *   - Array value: sets multiple values for same key
   *   - null/undefined: removes the param
   *   - Empty array: removes the param
   */
  const setParams = useCallback((updates) => {
    setPendingParams((current) => {
      // Clone current params
      const newParams = new URLSearchParams(current);

      for (const [key, value] of Object.entries(updates)) {
        // Remove existing values for this key first
        newParams.delete(key);

        if (value === null || value === undefined) {
          // null/undefined removes the param (already deleted above)
          continue;
        }

        if (Array.isArray(value)) {
          // Empty array removes the param
          if (value.length === 0) {
            continue;
          }
          // Add each value for array params
          for (const v of value) {
            if (v !== null && v !== undefined) {
              newParams.append(key, String(v));
            }
          }
        } else {
          // Single value
          newParams.set(key, String(value));
        }
      }

      return newParams;
    });
  }, []);

  return [params, setParams];
}
