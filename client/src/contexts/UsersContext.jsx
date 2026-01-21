import { createContext, useContext, useEffect, useReducer } from "react";
import { api } from "../utils/api";

const UsersContext = createContext(null);

const initialState = {
  users: [],
  currentUserId: null,
};

function usersReducer(state, action) {
  switch (action.type) {
    case "SET_USERS":
      return { ...state, users: action.value };
    case "SET_CURRENT_USER_ID":
      return { ...state, currentUserId: action.value };
    default:
      return state;
  }
}

export function UsersProvider({ children }) {
  const [state, dispatch] = useReducer(usersReducer, initialState, (base) => {
    const saved = localStorage.getItem("minijira_user");
    return {
      ...base,
      currentUserId: saved ? parseInt(saved) : null,
    };
  });

  useEffect(() => {
    async function loadUsers() {
      const usersData = await api.get("/users");
      dispatch({ type: "SET_USERS", value: usersData });
    }
    loadUsers();
  }, []);

  useEffect(() => {
    if (state.currentUserId) {
      localStorage.setItem("minijira_user", state.currentUserId.toString());
    }
  }, [state.currentUserId]);

  const value = {
    ...state,
    setCurrentUserId: (value) =>
      dispatch({ type: "SET_CURRENT_USER_ID", value }),
  };

  return (
    <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
}
