import { useContext } from "react";
import { ActivityContext } from "../ActivityContextBase";

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
