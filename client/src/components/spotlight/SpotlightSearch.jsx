import { useMemo } from "react";
import { Avatar, Badge, Group } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { UnassignedAvatar } from "../shared/UnassignedAvatar";
import { getPriorityColor } from "../../utils/colors";

export function SpotlightSearch({ allIssues, setSelectedIssue }) {
  const spotlightActions = useMemo(
    () =>
      allIssues.map((issue) => {
        const isSubtask = !!issue.parent_id;

        return {
          id: issue.id.toString(),
          label: issue.title,
          description: issue.description || "",
          onClick: () => setSelectedIssue(issue),
          keywords: [issue.key, issue.title, issue.description || ""].join(" "),
          leftSection: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              {/* Indentation for subtasks with status-based styling */}
              {isSubtask && (
                <div
                  style={{
                    width: "16px",
                    height:
                      issue.status === "done"
                        ? "6px"
                        : issue.status === "in_progress"
                        ? "4px"
                        : issue.status === "review"
                        ? "5px"
                        : "2px",
                    backgroundColor:
                      issue.status === "todo"
                        ? "var(--status-todo)"
                        : issue.status === "in_progress"
                        ? "var(--status-progress)"
                        : issue.status === "review"
                        ? "var(--status-review)"
                        : "var(--status-done)",
                    flexShrink: 0,
                    borderRadius: "2px",
                  }}
                />
              )}
              {/* Status indicator */}
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor:
                    issue.status === "todo"
                      ? "var(--status-todo)"
                      : issue.status === "in_progress"
                      ? "var(--status-progress)"
                      : issue.status === "review"
                      ? "var(--status-review)"
                      : "var(--status-done)",
                  flexShrink: 0,
                }}
              />
              {/* Issue key */}
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {issue.key}
              </div>
            </div>
          ),
          rightSection: (
            <Group gap="xs" wrap="nowrap">
              {/* Priority badge */}
              <Badge
                color={getPriorityColor(issue.priority)}
                size="sm"
                variant="light"
                style={{ flexShrink: 0 }}
              >
                {issue.priority}
              </Badge>
              {/* Assignee */}
              {issue.assignee_name ? (
                <Avatar
                  color={issue.assignee_color}
                  name={issue.assignee_name}
                  size="sm"
                  title={issue.assignee_name}
                  style={{ flexShrink: 0 }}
                />
              ) : (
                <UnassignedAvatar size="sm" />
              )}
            </Group>
          ),
        };
      }),
    [allIssues, setSelectedIssue]
  );

  return (
    <Spotlight
      actions={spotlightActions}
      nothingFound="No issues found..."
      highlightQuery
      scrollable
      maxHeight={600}
      searchProps={{
        placeholder: "Search Issues... (Try 'issues:' or 'subtasks:' to filter)",
      }}
      filter={(query, actions) => {
        const lowerQuery = query.toLowerCase().trim();

        // Check for filter prefixes
        if (lowerQuery.startsWith("issues:")) {
          // Filter for parent issues only
          const searchTerm = lowerQuery.slice(7).trim();
          return actions.filter((action) => {
            const issue = allIssues.find((i) => i.id.toString() === action.id);
            if (!issue || issue.parent_id) return false;
            if (!searchTerm) return true;
            return (
              issue.key.toLowerCase().includes(searchTerm) ||
              issue.title.toLowerCase().includes(searchTerm) ||
              (issue.description || "").toLowerCase().includes(searchTerm)
            );
          });
        } else if (lowerQuery.startsWith("subtasks:")) {
          // Filter for subtasks only
          const searchTerm = lowerQuery.slice(9).trim();
          return actions.filter((action) => {
            const issue = allIssues.find((i) => i.id.toString() === action.id);
            if (!issue || !issue.parent_id) return false;
            if (!searchTerm) return true;
            return (
              issue.key.toLowerCase().includes(searchTerm) ||
              issue.title.toLowerCase().includes(searchTerm) ||
              (issue.description || "").toLowerCase().includes(searchTerm)
            );
          });
        }

        return actions.filter((action) => {
          const issue = allIssues.find((i) => i.id.toString() === action.id);
          if (!issue) return false;

          if (!lowerQuery) return true;

          return (
            issue.key.toLowerCase().includes(lowerQuery) ||
            issue.title.toLowerCase().includes(lowerQuery) ||
            (issue.description || "").toLowerCase().includes(lowerQuery)
          );
        });
      }}
    />
  );
}
