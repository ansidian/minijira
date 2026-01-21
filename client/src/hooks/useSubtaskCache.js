import { useRef } from "react";
import { api } from "../utils/api";

export function useSubtaskCache() {
  const pendingSubtaskFetches = useRef(new Map());

  const fetchSubtasksForParent = async (parentId) => {
    if (pendingSubtaskFetches.current.has(parentId)) {
      return pendingSubtaskFetches.current.get(parentId);
    }

    const fetchPromise = api.get(`/issues/${parentId}/subtasks`).finally(() => {
      pendingSubtaskFetches.current.delete(parentId);
    });

    pendingSubtaskFetches.current.set(parentId, fetchPromise);
    return fetchPromise;
  };

  return { fetchSubtasksForParent };
}
