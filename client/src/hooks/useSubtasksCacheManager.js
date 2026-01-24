import { useCallback, useRef } from "react";
import { api } from "../utils/api";

/**
 * Centralized subtasks cache manager.
 *
 * This hook is the SINGLE source of truth for all subtasks cache operations.
 * All reads, writes, and invalidations must go through this hook.
 *
 * INVALIDATION RULES:
 * | Mutation                | Invalidate                              |
 * |-------------------------|----------------------------------------|
 * | Update issue status     | Parent's cache (if issue is subtask)   |
 * | Create subtask          | Parent's cache                          |
 * | Delete subtask          | Parent's cache                          |
 * | Delete parent           | Parent's cache (cleanup)                |
 * | Update subtask fields   | Parent's cache                          |
 * | Move issue (reparent)   | Old parent + new parent caches          |
 *
 * @param {Object} cacheState - The subtasks cache state object (owned by IssuesContext)
 * @param {Function} setCacheState - Setter for cache state
 * @returns {Object} Cache operations
 */
export function useSubtasksCacheManager(cacheState, setCacheState) {
  const pendingSubtaskFetches = useRef(new Map());

  /**
   * Read subtasks from cache for a parent issue.
   * @param {number} parentId - The parent issue ID
   * @returns {Array|null} Cached subtasks array or null if not cached
   */
  const getCached = useCallback(
    (parentId) => {
      return cacheState[parentId] || null;
    },
    [cacheState]
  );

  /**
   * Write subtasks to cache for a parent issue.
   * @param {number} parentId - The parent issue ID
   * @param {Array} subtasks - Array of subtask objects
   */
  const setCached = useCallback(
    (parentId, subtasks) => {
      setCacheState((prev) => ({ ...prev, [parentId]: subtasks }));
    },
    [setCacheState]
  );

  /**
   * Remove cache entries for specified parent IDs.
   * This triggers a refetch on next read (when subtasks are expanded).
   * @param {Array<number>} parentIds - Array of parent issue IDs to invalidate
   */
  const invalidateCache = useCallback(
    (parentIds) => {
      setCacheState((prev) => {
        const next = { ...prev };
        parentIds.forEach((id) => delete next[id]);
        return next;
      });
    },
    [setCacheState]
  );

  /**
   * Merge multiple cache entries at once.
   * Used when fetching subtasks for multiple parents simultaneously.
   * @param {Object} updates - Object mapping parent IDs to subtask arrays
   */
  const mergeCached = useCallback(
    (updates) => {
      setCacheState((prev) => ({ ...prev, ...updates }));
    },
    [setCacheState]
  );

  /**
   * Update a single subtask within a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {number} subtaskId - The subtask ID to update
   * @param {Object} updates - Fields to update on the subtask
   */
  const updateCachedSubtask = useCallback(
    (parentId, subtaskId, updates) => {
      setCacheState((prev) => {
        const cached = prev[parentId];
        if (!cached) return prev;

        return {
          ...prev,
          [parentId]: cached.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
          ),
        };
      });
    },
    [setCacheState]
  );

  /**
   * Add a new subtask to a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {Object} subtask - The subtask object to add
   */
  const addCachedSubtask = useCallback(
    (parentId, subtask) => {
      setCacheState((prev) => {
        const cached = prev[parentId];
        if (!cached) return prev;

        return {
          ...prev,
          [parentId]: [subtask, ...cached],
        };
      });
    },
    [setCacheState]
  );

  /**
   * Remove a subtask from a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {number} subtaskId - The subtask ID to remove
   */
  const removeCachedSubtask = useCallback(
    (parentId, subtaskId) => {
      setCacheState((prev) => {
        const cached = prev[parentId];
        if (!cached) return prev;

        return {
          ...prev,
          [parentId]: cached.filter((subtask) => subtask.id !== subtaskId),
        };
      });
    },
    [setCacheState]
  );

  /**
   * Fetch subtasks for a parent issue from the server.
   * Includes fetch deduplication to prevent multiple simultaneous requests for the same parent.
   * @param {number} parentId - The parent issue ID
   * @returns {Promise<Array>} Array of subtask objects
   */
  const fetchSubtasksForParent = useCallback(async (parentId) => {
    if (pendingSubtaskFetches.current.has(parentId)) {
      return pendingSubtaskFetches.current.get(parentId);
    }

    const fetchPromise = api.get(`/issues/${parentId}/subtasks`).finally(() => {
      pendingSubtaskFetches.current.delete(parentId);
    });

    pendingSubtaskFetches.current.set(parentId, fetchPromise);
    return fetchPromise;
  }, []);

  /**
   * Fetch subtasks for multiple parent issues in a single request.
   * Returns grouped object: { [parentId]: subtasks[] }
   * @param {Array<number>} parentIds - Array of parent issue IDs
   * @returns {Promise<Object>} Object mapping parent IDs to subtask arrays
   */
  const fetchSubtasksBatch = useCallback(
    async (parentIds) => {
      if (!parentIds || parentIds.length === 0) {
        return {};
      }

      // For single parent, use existing function (already has deduplication)
      if (parentIds.length === 1) {
        const subtasks = await fetchSubtasksForParent(parentIds[0]);
        return { [parentIds[0]]: subtasks };
      }

      // Batch fetch for multiple parents
      const idsParam = parentIds.join(",");
      return api.get(`/issues/subtasks/batch?parent_ids=${idsParam}`);
    },
    [fetchSubtasksForParent],
  );

  return {
    getCached,
    setCached,
    invalidateCache,
    mergeCached,
    updateCachedSubtask,
    addCachedSubtask,
    removeCachedSubtask,
    fetchSubtasksForParent,
    fetchSubtasksBatch,
  };
}
