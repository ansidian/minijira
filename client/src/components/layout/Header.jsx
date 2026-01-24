import { Button } from "@mantine/core";
import { StatsDisplay } from "./header/StatsDisplay";
import { SearchButton } from "./header/SearchButton";
import { ActivityButton } from "./header/ActivityButton";
import { ThemeToggle } from "./header/ThemeToggle";
import { UserSelector } from "./header/UserSelector";

export function Header({
  stats,
  statsBadgeAnimate,
  allExpanded,
  toggleAllSubtasks,
  hasNewActivity,
  setShowActivityLog,
  isUserLocked,
  colorScheme,
  setColorScheme,
  users,
  currentUser,
  currentUserId,
  setCurrentUserId,
}) {
  return (
    <header className={`header ${isUserLocked ? "user-locked" : ""}`}>
      <div className="logo">
        <div className="logo-icon">MJ</div>
        <span>MiniJira</span>
        <Button
          variant="light"
          size="sm"
          color="blue"
          onClick={toggleAllSubtasks}
          disabled={isUserLocked}
          className="subtask-toggle-desktop"
          leftSection={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: allExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          }
          style={{ marginLeft: "1rem" }}
        >
          <span className="subtask-toggle-text-full">
            {allExpanded ? "Hide All Subtasks" : "Show All Subtasks"}
          </span>
        </Button>
        <StatsDisplay stats={stats} statsBadgeAnimate={statsBadgeAnimate} />
      </div>
      <div className="header-right">
        <SearchButton isUserLocked={isUserLocked} />
        <ActivityButton
          hasNewActivity={hasNewActivity}
          setShowActivityLog={setShowActivityLog}
          isUserLocked={isUserLocked}
        />
        <ThemeToggle
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          isUserLocked={isUserLocked}
        />
        <UserSelector
          users={users}
          currentUser={currentUser}
          currentUserId={currentUserId}
          setCurrentUserId={setCurrentUserId}
          allExpanded={allExpanded}
          toggleAllSubtasks={toggleAllSubtasks}
          isUserLocked={isUserLocked}
        />
      </div>
    </header>
  );
}
