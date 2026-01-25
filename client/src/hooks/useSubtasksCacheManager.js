import { useCallback, useRef } from "react";
import { api } from "../utils/api";

/**
 * LRU (Least Recently Used) Cache implementation.
 * Uses Map to maintain insertion order for efficient eviction.
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get value and promote to most recently used.
   * @param {string|number} key
   * @returns {*} The cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recent) by deleting and re-inserting
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set value and evict oldest if over maxSize.
   * @param {string|number} key
   * @param {*} value
   */
  set(key, value) {
    // If key exists, delete it first so we can re-add at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Evict oldest entry if over size limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.debug(`[LRU Cache] Evicted entry for parent ${firstKey} (cache size: ${this.cache.size})`);
    }
  }

  /**
   * Check if key exists in cache.
   * @param {string|number} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete entry from cache.
   * @param {string|number} key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get iterator for all entries.
   * @returns {Iterator}
   */
  entries() {
    return this.cache.entries();
  }

  /**
   * Get current size.
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

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
  const cache = useRef(new LRUCache(100));

  /**
   * Sync LRU cache to React state for reactivity.
   * Called after any mutation to trigger re-renders.
   */
  const syncCacheToState = useCallback(() => {
    const snapshot = Object.fromEntries(cache.current.entries());
    setCacheState(snapshot);
  }, [setCacheState]);

  /**
   * Read subtasks from cache for a parent issue.
   * @param {number} parentId - The parent issue ID
   * @returns {Array|null} Cached subtasks array or null if not cached
   */
  const getCached = useCallback(
    (parentId) => {
      return cache.current.get(parentId) || null;
    },
    []
  );

  /**
   * Write subtasks to cache for a parent issue.
   * @param {number} parentId - The parent issue ID
   * @param {Array} subtasks - Array of subtask objects
   */
  const setCached = useCallback(
    (parentId, subtasks) => {
      cache.current.set(parentId, subtasks);
      syncCacheToState();
    },
    [syncCacheToState]
  );

  /**
   * Remove cache entries for specified parent IDs.
   * This triggers a refetch on next read (when subtasks are expanded).
   * @param {Array<number>} parentIds - Array of parent issue IDs to invalidate
   */
  const invalidateCache = useCallback(
    (parentIds) => {
      parentIds.forEach((id) => cache.current.delete(id));
      syncCacheToState();
    },
    [syncCacheToState]
  );

  /**
   * Merge multiple cache entries at once.
   * Used when fetching subtasks for multiple parents simultaneously.
   * @param {Object} updates - Object mapping parent IDs to subtask arrays
   */
  const mergeCached = useCallback(
    (updates) => {
      Object.entries(updates).forEach(([parentId, subtasks]) => {
        cache.current.set(Number(parentId), subtasks);
      });
      syncCacheToState();
    },
    [syncCacheToState]
  );

  /**
   * Update a single subtask within a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {number} subtaskId - The subtask ID to update
   * @param {Object} updates - Fields to update on the subtask
   */
  const updateCachedSubtask = useCallback(
    (parentId, subtaskId, updates) => {
      const cached = cache.current.get(parentId);
      if (!cached) return;

      const updated = cached.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
      );
      cache.current.set(parentId, updated);
      syncCacheToState();
    },
    [syncCacheToState]
  );

  /**
   * Add a new subtask to a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {Object} subtask - The subtask object to add
   */
  const addCachedSubtask = useCallback(
    (parentId, subtask) => {
      const cached = cache.current.get(parentId);
      if (!cached) return;

      cache.current.set(parentId, [subtask, ...cached]);
      syncCacheToState();
    },
    [syncCacheToState]
  );

  /**
   * Remove a subtask from a parent's cache.
   * @param {number} parentId - The parent issue ID
   * @param {number} subtaskId - The subtask ID to remove
   */
  const removeCachedSubtask = useCallback(
    (parentId, subtaskId) => {
      const cached = cache.current.get(parentId);
      if (!cached) return;

      cache.current.set(
        parentId,
        cached.filter((subtask) => subtask.id !== subtaskId)
      );
      syncCacheToState();
    },
    [syncCacheToState]
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
