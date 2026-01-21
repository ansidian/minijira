import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useReducer,
} from "react";
import { API_BASE } from "../utils/api";
import { useIssues } from "./IssuesContext";
import { useUI } from "./UIContext";
import { useActivityPolling } from "../hooks/useActivityPolling";
import { useUsers } from "./UsersContext";

const ActivityContext = createContext(null);

const initialState = {
  showActivityLog: false,
  hasNewActivity: false,
};

function activityReducer(state, action) {
  switch (action.type) {
    case "SET_SHOW_ACTIVITY_LOG":
      return { ...state, showActivityLog: action.value };
    case "SET_HAS_NEW_ACTIVITY":
      return { ...state, hasNewActivity: action.value };
    default:
      return state;
  }
}

export function ActivityProvider({ children }) {
  const [state, dispatch] = useReducer(activityReducer, initialState);
  const { currentUserId } = useUsers();
  const {
    loadData,
    fetchSubtasksForParent,
    expandedIssues,
    setExpandedIssues,
    subtasksCache,
    setSubtasksCache,
  } = useIssues();
  const { setStatsBadgeAnimate } = useUI();

  const setShowActivityLog = useCallback(
    (value) => dispatch({ type: "SET_SHOW_ACTIVITY_LOG", value }),
    []
  );

  const setHasNewActivity = useCallback(
    (value) => dispatch({ type: "SET_HAS_NEW_ACTIVITY", value }),
    []
  );

  const expandedIssuesRef = useRef(expandedIssues);
  useEffect(() => {
    expandedIssuesRef.current = expandedIssues;
  }, [expandedIssues]);

  const subtasksCacheRef = useRef(subtasksCache);
  useEffect(() => {
    subtasksCacheRef.current = subtasksCache;
  }, [subtasksCache]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useActivityPolling({
    showActivityLog: state.showActivityLog,
    setHasNewActivity,
    currentUserId,
  });

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/events`);
    let isInitialConnection = true;

    eventSource.onopen = () => {
      console.log("SSE connected");
      if (!isInitialConnection) {
        loadDataRef.current();
      }
      isInitialConnection = false;
    };

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          return;
        }

        console.log("SSE event received:", data);

        await loadDataRef.current();

        const isSelfEvent =
          currentUserId &&
          data.userId &&
          Number(data.userId) === Number(currentUserId);

        if (
          data.type === "issue_created" ||
          data.type === "issue_updated" ||
          data.type === "issue_deleted"
        ) {
          setStatsBadgeAnimate(true);
          setTimeout(() => setStatsBadgeAnimate(false), 300);
          if (!isSelfEvent) {
            dispatch({ type: "SET_HAS_NEW_ACTIVITY", value: true });
          }
        }

        if (data.type === "issue_deleted") {
          const newExpanded = new Set(expandedIssuesRef.current);
          if (newExpanded.has(data.issueId)) {
            newExpanded.delete(data.issueId);
            setExpandedIssues(newExpanded);
          }

          if (subtasksCacheRef.current[data.issueId]) {
            const newCache = { ...subtasksCacheRef.current };
            delete newCache[data.issueId];
            setSubtasksCache(newCache);
          }
        }

        const parentsToRefresh = new Set(expandedIssuesRef.current);
        if (data.parentId) {
          parentsToRefresh.add(data.parentId);
        }
        if (data.type === "issue_deleted") {
          parentsToRefresh.delete(data.issueId);
        }

        if (parentsToRefresh.size > 0) {
          const parentIds = Array.from(parentsToRefresh);
          const results = await Promise.all(
            parentIds.map(async (issueId) => {
              try {
                const subtasks = await fetchSubtasksForParent(issueId);
                return { issueId, subtasks };
              } catch (error) {
                console.error(
                  `Failed to fetch subtasks for issue ${issueId}:`,
                  error
                );
                return { issueId, subtasks: [] };
              }
            })
          );

          const newCache = { ...subtasksCacheRef.current };
          for (const { issueId, subtasks } of results) {
            newCache[issueId] = subtasks;
          }
          setSubtasksCache(newCache);
        }
      } catch (error) {
        console.error("Error processing SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [
    fetchSubtasksForParent,
    currentUserId,
    setExpandedIssues,
    setStatsBadgeAnimate,
    setSubtasksCache,
  ]);

  const value = {
    ...state,
    setShowActivityLog,
    setHasNewActivity,
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
