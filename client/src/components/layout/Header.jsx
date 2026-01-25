import { Button, ActionIcon, Indicator, Popover } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { StatsDisplay } from "./header/StatsDisplay";
import { SearchButton } from "./header/SearchButton";
import { ActivityButton } from "./header/ActivityButton";
import { ThemeToggle } from "./header/ThemeToggle";
import { UserSelector } from "./header/UserSelector";
import { FilterPanel } from "../board/FilterPanel";
import { MobileDrawer } from "./MobileDrawer";
import { useMobile } from "../../hooks/useMobile";

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

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
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
  const isMobile = useMobile();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  return (
    <header className={`header ${isUserLocked ? "user-locked" : ""}`}>
      <div className="logo">
        {/* Hamburger menu - mobile only */}
        {isMobile && (
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={openDrawer}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpened}
            className="hamburger-button"
          >
            <HamburgerIcon />
          </ActionIcon>
        )}

        <div className="logo-icon">MJ</div>
        <span className="logo-text">MiniJira</span>

        {/* Desktop-only subtask toggle */}
        {!isMobile && (
          <Button
            variant="light"
            size="sm"
            color="orange"
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
        )}

        {!isMobile && <StatsDisplay stats={stats} statsBadgeAnimate={statsBadgeAnimate} />}
      </div>

      {/* Desktop header controls */}
      {!isMobile && (
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
              color="orange"
            >
              <ActionIcon
                variant={filterPanelExpanded ? "filled" : "light"}
                color={activeFilterCount > 0 ? "orange" : "gray"}
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
      )}

      {/* Mobile: Search button only in header (other controls in drawer) */}
      {isMobile && (
        <div className="header-right-mobile">
          <SearchButton isUserLocked={isUserLocked} />
        </div>
      )}

      {/* Mobile Drawer */}
      <MobileDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        currentUserId={currentUserId}
        activeFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        hasNewActivity={hasNewActivity}
        onOpenActivity={() => setShowActivityLog(true)}
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        users={users}
        currentUser={currentUser}
        setCurrentUserId={setCurrentUserId}
        allExpanded={allExpanded}
        toggleAllSubtasks={toggleAllSubtasks}
        isUserLocked={isUserLocked}
      />
    </header>
  );
}
