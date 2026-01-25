import { Button, ActionIcon, Indicator, Popover } from "@mantine/core";
import { StatsDisplay } from "./header/StatsDisplay";
import { SearchButton } from "./header/SearchButton";
import { ActivityButton } from "./header/ActivityButton";
import { ThemeToggle } from "./header/ThemeToggle";
import { UserSelector } from "./header/UserSelector";
import { FilterPanel } from "../board/FilterPanel";

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

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
  filterPanelExpanded,
  setFilterPanelExpanded,
  activeFilterCount,
  activeFilters,
  onFiltersChange,
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
        <Popover
          opened={filterPanelExpanded}
          onChange={setFilterPanelExpanded}
          position="bottom-end"
          offset={8}
          shadow="lg"
          withArrow={false}
        >
          <Popover.Target>
            <Indicator
              label={activeFilterCount}
              size={16}
              disabled={activeFilterCount === 0 || filterPanelExpanded}
              color="violet"
            >
              <ActionIcon
                variant={filterPanelExpanded ? "filled" : "light"}
                color={activeFilterCount > 0 ? "violet" : "gray"}
                size="lg"
                onClick={() => setFilterPanelExpanded(!filterPanelExpanded)}
                disabled={isUserLocked}
                aria-label="Toggle filters"
              >
                <FilterIcon />
              </ActionIcon>
            </Indicator>
          </Popover.Target>
          <Popover.Dropdown p={0} style={{ border: "none", background: "transparent" }}>
            <FilterPanel
              currentUserId={currentUserId}
              appliedFilters={activeFilters}
              onApply={onFiltersChange}
              onClose={() => setFilterPanelExpanded(false)}
            />
          </Popover.Dropdown>
        </Popover>
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
