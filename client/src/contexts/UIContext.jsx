import { createContext, useContext, useReducer } from "react";

const UIContext = createContext(null);

const initialState = {
  selectedIssue: null,
  showCreateModal: false,
  createStatus: "todo",
  autoShowSubtaskForm: false,
  statsBadgeAnimate: false,
  previousStats: null,
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
    case "SET_PREVIOUS_STATS":
      return { ...state, previousStats: action.value };
    default:
      return state;
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const value = {
    ...state,
    setSelectedIssue: (value) =>
      dispatch({ type: "SET_SELECTED_ISSUE", value }),
    setShowCreateModal: (value) =>
      dispatch({ type: "SET_SHOW_CREATE_MODAL", value }),
    setCreateStatus: (value) => dispatch({ type: "SET_CREATE_STATUS", value }),
    setAutoShowSubtaskForm: (value) =>
      dispatch({ type: "SET_AUTO_SHOW_SUBTASK_FORM", value }),
    setStatsBadgeAnimate: (value) =>
      dispatch({ type: "SET_STATS_BADGE_ANIMATE", value }),
    setPreviousStats: (value) =>
      dispatch({ type: "SET_PREVIOUS_STATS", value }),
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
