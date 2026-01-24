import { Badge, HoverCard, Progress, Stack } from "@mantine/core";

export function StatsDisplay({ stats, statsBadgeAnimate }) {
  return (
    <HoverCard width={380} shadow="md" position="bottom" withArrow>
      <HoverCard.Target>
        <Badge
          size="lg"
          variant="light"
          color="gray"
          style={{
            cursor: "pointer",
            marginLeft: "1rem",
            transition: "transform 0.2s ease",
            transform: statsBadgeAnimate ? "scale(1.15)" : "scale(1)",
          }}
        >
          <span className="stats-badge">
            <span className="stats-pill-part stats-pill-todo">
              {stats?.todo || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-progress">
              {stats?.in_progress || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-review">
              {stats?.review || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-done">
              {stats?.done || 0}
            </span>
          </span>
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap="xs">
          <div className="stats-title">Issue Stats</div>
          <div className="stats-hash">
            <span className="stats-pill-part stats-pill-todo">
              {stats?.todo || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-progress">
              {stats?.in_progress || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-review">
              {stats?.review || 0}
            </span>
            <span className="stats-pill-sep">/</span>
            <span className="stats-pill-part stats-pill-done">
              {stats?.done || 0}
            </span>
          </div>
          {/* Progress bars */}
          <Stack gap={8}>
            <div className="stat-row">
              <span className="stat-label">To Do</span>
              <Progress
                value={
                  (stats.todo /
                    Math.max(
                      1,
                      stats.todo +
                        stats.in_progress +
                        stats.review +
                        stats.done,
                    )) *
                  100
                }
                color="gray"
              />
              <span className="stat-count">{stats.todo}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">In Progress</span>
              <Progress
                value={
                  (stats.in_progress /
                    Math.max(
                      1,
                      stats.todo +
                        stats.in_progress +
                        stats.review +
                        stats.done,
                    )) *
                  100
                }
                color="blue"
              />
              <span className="stat-count">{stats.in_progress}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Review</span>
              <Progress
                value={
                  (stats.review /
                    Math.max(
                      1,
                      stats.todo +
                        stats.in_progress +
                        stats.review +
                        stats.done,
                    )) *
                  100
                }
                color="violet"
              />
              <span className="stat-count">{stats.review}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Done</span>
              <Progress
                value={
                  (stats.done /
                    Math.max(
                      1,
                      stats.todo +
                        stats.in_progress +
                        stats.review +
                        stats.done,
                    )) *
                  100
                }
                color="green"
              />
              <span className="stat-count">{stats.done}</span>
            </div>
          </Stack>
          <div className="stats-footer">
            {" "}
            ⌨️ Right-click issues for contextual actions
          </div>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
