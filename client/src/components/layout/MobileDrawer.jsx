import { Drawer, Stack, Divider, Text, Button } from "@mantine/core";
import { FilterPanel } from "../board/FilterPanel";
import { ThemeToggle } from "./header/ThemeToggle";
import { UserSelector } from "./header/UserSelector";

/**
 * Slide-out drawer for mobile navigation.
 * Contains filters, activity log trigger, settings, and user switcher.
 */
export function MobileDrawer({
  opened,
  onClose,
  // Filter props
  currentUserId,
  activeFilters,
  onFiltersChange,
  // Activity props
  hasNewActivity,
  onOpenActivity,
  // Theme props
  colorScheme,
  setColorScheme,
  // User props
  users,
  currentUser,
  setCurrentUserId,
  // Subtask toggle
  allExpanded,
  toggleAllSubtasks,
  isUserLocked,
}) {
  const handleActivityClick = () => {
    onOpenActivity();
    onClose(); // Close drawer when opening activity modal
  };

  const handleFiltersChange = (filters) => {
    onFiltersChange(filters);
    // Don't close drawer on filter apply - let user continue adjusting
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      size="80%"
      title="Menu"
      overlayProps={{ opacity: 0.5, blur: 4 }}
      closeOnClickOutside
      closeOnEscape
      trapFocus
      styles={{
        title: {
          fontWeight: 600,
          fontSize: "var(--text-lg)",
        },
        body: {
          padding: "0 16px 16px",
        },
      }}
    >
      <Stack gap="md">
        {/* User Selector */}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={8}>
            Current User
          </Text>
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

        <Divider />

        {/* Filters Section */}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={8}>
            Filters
          </Text>
          <FilterPanel
            currentUserId={currentUserId}
            appliedFilters={activeFilters}
            onApply={handleFiltersChange}
            onClose={() => {}} // Don't close drawer on filter panel close
          />
        </div>

        <Divider />

        {/* Actions */}
        <Stack gap="xs">
          <Button
            variant="subtle"
            color="gray"
            fullWidth
            justify="flex-start"
            leftSection={
              <span style={{ position: "relative", display: "flex" }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                {hasNewActivity && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "red",
                    }}
                  />
                )}
              </span>
            }
            onClick={handleActivityClick}
            disabled={isUserLocked}
          >
            Activity Log
          </Button>

          <Button
            variant="subtle"
            color="gray"
            fullWidth
            justify="flex-start"
            leftSection={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline
                  points="6 9 12 15 18 9"
                  style={{
                    transform: allExpanded ? "rotate(180deg)" : "none",
                    transformOrigin: "center",
                  }}
                />
              </svg>
            }
            onClick={() => {
              toggleAllSubtasks();
            }}
            disabled={isUserLocked}
          >
            {allExpanded ? "Hide All Subtasks" : "Show All Subtasks"}
          </Button>
        </Stack>

        <Divider />

        {/* Theme Toggle */}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={8}>
            Appearance
          </Text>
          <ThemeToggle
            colorScheme={colorScheme}
            setColorScheme={setColorScheme}
            isUserLocked={isUserLocked}
          />
        </div>
      </Stack>
    </Drawer>
  );
}
