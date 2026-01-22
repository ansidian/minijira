import { useContext } from "react";
import { IssuesContext } from "../IssuesContextBase";

export function useIssues() {
  const context = useContext(IssuesContext);
  if (!context) {
    throw new Error("useIssues must be used within an IssuesProvider");
  }
  return context;
}
