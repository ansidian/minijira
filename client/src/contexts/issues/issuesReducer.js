export const initialState = {
  issues: [],
  allIssues: [],
  stats: {
    total: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  },
  loading: true,
  expandedIssues: new Set(),
  subtasksCache: {},
};

export function issuesReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.value };
    case "SET_ISSUES":
      return { ...state, issues: action.value };
    case "SET_ALL_ISSUES":
      return { ...state, allIssues: action.value };
    case "SET_STATS":
      return { ...state, stats: action.value };
    case "SET_EXPANDED_ISSUES":
      return { ...state, expandedIssues: new Set(action.value) };
    case "SET_SUBTASKS_CACHE":
      return { ...state, subtasksCache: action.value };
    case "MERGE_SUBTASKS_CACHE":
      return {
        ...state,
        subtasksCache: { ...state.subtasksCache, ...action.value },
      };
    case "UPDATE_ISSUE":
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.value.id ? action.value : issue,
        ),
      };
    case "ADD_ISSUE":
      return { ...state, issues: [action.value, ...state.issues] };
    case "ADD_TO_ALL_ISSUES":
      return { ...state, allIssues: [action.value, ...state.allIssues] };
    case "UPDATE_IN_ALL_ISSUES":
      return {
        ...state,
        allIssues: state.allIssues.map((issue) =>
          issue.id === action.value.id ? action.value : issue,
        ),
      };
    case "REMOVE_FROM_ALL_ISSUES":
      return {
        ...state,
        allIssues: state.allIssues.filter((issue) => issue.id !== action.value),
      };
    default:
      return state;
  }
}
