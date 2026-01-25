import { Paper, Skeleton, Stack, Group } from "@mantine/core";

/**
 * Skeleton placeholder that matches the IssueCard layout.
 * Uses Mantine's Skeleton component with built-in shimmer animation.
 */
export function IssueCardSkeleton() {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <Paper
        p="md"
        withBorder
        style={{ cursor: "default" }}
      >
        <Stack gap="xs">
          {/* Issue key */}
          <Skeleton height={14} width={60} radius="sm" />

          {/* Title */}
          <Skeleton height={16} width="85%" radius="sm" />

          {/* Bottom row with avatar, priority badge, and subtask indicator */}
          <Group justify="space-between" mt="xs">
            <Group gap="xs">
              {/* Priority badge */}
              <Skeleton height={20} width={55} radius="xl" />
              {/* Subtask count badge (sometimes visible) */}
              <Skeleton height={20} width={40} radius="xl" />
            </Group>
            {/* Avatar */}
            <Skeleton height={26} width={26} circle />
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}

/**
 * Renders multiple skeleton cards.
 * @param {number} count - Number of skeletons to render (default: 3)
 */
export function IssueCardSkeletons({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <IssueCardSkeleton key={i} />
      ))}
    </>
  );
}
