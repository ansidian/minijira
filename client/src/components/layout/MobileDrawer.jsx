import { Drawer, Stack, Text, Button, SegmentedControl, Avatar, Select } from "@mantine/core";
import { FilterPanel } from "../board/FilterPanel";

/**
 * Slide-out drawer for mobile navigation.
 * Contains user switcher, filters, activity log trigger, and settings.
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
    onClose();
  };

  const handleFiltersChange = (filters) => {
    onFiltersChange(filters);
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      size="85%"
      withCloseButton={false}
      overlayProps={{ opacity: 0.6, blur: 8 }}
      closeOnClickOutside
      closeOnEscape
      trapFocus
      styles={{
        content: {
          background: "var(--bg-primary)",
        },
        body: {
          padding: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "var(--accent)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "12px",
              color: "#fff",
            }}
          >
            MJ
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            MiniJira
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Close menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <Stack gap="24px">
          {/* User Section */}
          <div>
            <Text
              size="xs"
              c="var(--text-muted)"
              tt="uppercase"
              fw={600}
              mb={12}
              style={{ letterSpacing: "0.05em" }}
            >
              Working as
            </Text>
            <Select
              value={currentUserId?.toString() || ""}
              onChange={(value) => setCurrentUserId(value ? parseInt(value) : null)}
              placeholder="Select yourself..."
              data={users.map((user) => ({
                value: user.id.toString(),
                label: user.name,
              }))}
              leftSection={
                currentUser ? (
                  <Avatar
                    color={currentUser.avatar_color}
                    name={currentUser.name}
                    size={24}
                    radius="xl"
                  />
                ) : null
              }
              styles={{
                input: {
                  background: "var(--bg-tertiary)",
                  border: "none",
                  boxShadow: "var(--shadow-inset)",
                  paddingLeft: currentUser ? "44px" : undefined,
                  minHeight: "48px",
                  fontSize: "var(--text-base)",
                },
              }}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <Text
              size="xs"
              c="var(--text-muted)"
              tt="uppercase"
              fw={600}
              mb={12}
              style={{ letterSpacing: "0.05em" }}
            >
              Quick Actions
            </Text>
            <Stack gap="8px">
              <Button
                variant="light"
                color="gray"
                fullWidth
                justify="flex-start"
                size="md"
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
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
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
                          background: "var(--priority-high)",
                        }}
                      />
                    )}
                  </span>
                }
                onClick={handleActivityClick}
                disabled={isUserLocked}
                styles={{
                  root: {
                    background: "var(--bg-tertiary)",
                    "&:hover": { background: "var(--bg-hover)" },
                  },
                }}
              >
                Activity Log
              </Button>

              <Button
                variant="light"
                color="gray"
                fullWidth
                justify="flex-start"
                size="md"
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
                    style={{
                      transform: allExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                }
                onClick={toggleAllSubtasks}
                disabled={isUserLocked}
                styles={{
                  root: {
                    background: "var(--bg-tertiary)",
                    "&:hover": { background: "var(--bg-hover)" },
                  },
                }}
              >
                {allExpanded ? "Hide All Subtasks" : "Show All Subtasks"}
              </Button>
            </Stack>
          </div>

          {/* Filters */}
          <div>
            <Text
              size="xs"
              c="var(--text-muted)"
              tt="uppercase"
              fw={600}
              mb={12}
              style={{ letterSpacing: "0.05em" }}
            >
              Filters
            </Text>
            <FilterPanel
              currentUserId={currentUserId}
              appliedFilters={activeFilters}
              onApply={handleFiltersChange}
              onClose={() => {}}
              showHeader={false}
            />
          </div>
        </Stack>
      </div>

      {/* Footer - Theme Toggle */}
      <div
        style={{
          padding: "16px 20px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--border-primary)",
          background: "var(--bg-secondary)",
        }}
      >
        <SegmentedControl
          value={colorScheme}
          onChange={setColorScheme}
          fullWidth
          data={[
            {
              value: "light",
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  Light
                </div>
              ),
            },
            {
              value: "dark",
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </div>
              ),
            },
          ]}
          styles={{
            root: {
              background: "var(--bg-tertiary)",
            },
          }}
        />
      </div>
    </Drawer>
  );
}
