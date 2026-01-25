import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";

const UIContext = createContext(null);

const initialState = {
  selectedIssue: null,
  showCreateModal: false,
  createStatus: "todo",
  autoShowSubtaskForm: false,
  statsBadgeAnimate: false,
};

function uiReducer(state, action) {
  switch (action.type) {
    case "SET_SELECTED_ISSUE":
      return { ...state, selectedIssue: action.value };
    case "SET_SHOW_CREATE_MODAL":
      return { ...state, showCreateModal: action.value };
    case "SET_CREATE_STATUS":
      return { ...state, createStatus: action.value };
    case "SET_AUTO_SHOW_SUBTASK_FORM":
      return { ...state, autoShowSubtaskForm: action.value };
    case "SET_STATS_BADGE_ANIMATE":
      return { ...state, statsBadgeAnimate: action.value };
    default:
      return state;
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Stable function references (dispatch is stable from useReducer)
  const setSelectedIssue = useCallback(
    (value) => dispatch({ type: "SET_SELECTED_ISSUE", value }),
    [],
  );
  const setShowCreateModal = useCallback(
    (value) => dispatch({ type: "SET_SHOW_CREATE_MODAL", value }),
    [],
  );
  const setCreateStatus = useCallback(
    (value) => dispatch({ type: "SET_CREATE_STATUS", value }),
    [],
  );
  const setAutoShowSubtaskForm = useCallback(
    (value) => dispatch({ type: "SET_AUTO_SHOW_SUBTASK_FORM", value }),
    [],
  );
  const setStatsBadgeAnimate = useCallback(
    (value) => dispatch({ type: "SET_STATS_BADGE_ANIMATE", value }),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      setSelectedIssue,
      setShowCreateModal,
      setCreateStatus,
      setAutoShowSubtaskForm,
      setStatsBadgeAnimate,
    }),
    [
      state,
      setSelectedIssue,
      setShowCreateModal,
      setCreateStatus,
      setAutoShowSubtaskForm,
      setStatsBadgeAnimate,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
