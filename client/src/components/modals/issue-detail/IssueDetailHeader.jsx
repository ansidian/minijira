import { Badge, Button, Group } from "@mantine/core";

export function IssueDetailHeader({ issue, isSubtask, onViewIssue }) {
  return (
    <>
      {/* Parent issue link for subtasks */}
      {isSubtask && issue.parent_key && (
        <Button
          variant="subtle"
          size="xs"
          mb="md"
          onClick={() => onViewIssue(issue.parent_id)}
          style={{ marginLeft: "-0.5rem" }}
        >
          ← Back to {issue.parent_key}
        </Button>
      )}

      <Group gap="xs">
        {issue.key}
        {isSubtask && (
          <Badge size="sm" variant="light" color="blue">
            Subtask
          </Badge>
        )}
      </Group>
    </>
  );
}
