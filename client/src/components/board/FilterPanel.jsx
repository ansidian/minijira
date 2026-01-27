import { useState, useMemo } from "react";
import {
  MultiSelect,
  Group,
  Stack,
  Text,
  CloseButton,
  Switch,
  SegmentedControl,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import dayjs from "dayjs";
import { useUsers } from "../../contexts/UsersContext";
import { useMobile } from "../../hooks/useMobile";
import { isMac } from "../../utils/platform";
import { IconTrash } from "@tabler/icons-react";

// Shared date presets used by both DatePickerInput and mobile preset buttons
function getDatePresets(today) {
  return [
    {
      key: "last-2-days",
      label: "2 days",
      value: [
        today.subtract(2, "day").startOf("day").toDate(),
        today.endOf("day").toDate(),
      ],
    },
    {
      key: "last-7-days",
      label: "7 days",
      value: [
        today.subtract(7, "day").startOf("day").toDate(),
        today.endOf("day").toDate(),
      ],
    },
    {
      key: "this-month",
      label: "This month",
      value: [today.startOf("month").toDate(), today.endOf("day").toDate()],
    },
    {
      key: "last-month",
      label: "Last month",
      value: [
        today.subtract(1, "month").startOf("month").toDate(),
        today.subtract(1, "month").endOf("month").toDate(),
      ],
    },
  ];
}

// Preset button selector for date ranges
function DatePresetButtons({ presets, value, onChange }) {
  // Check if current value matches a preset
  const selectedPresetKey = useMemo(() => {
    if (!value || !value[0] || !value[1]) return null;
    const preset = presets.find(
      (p) =>
        p.value[0].getTime() === value[0].getTime() &&
        p.value[1].getTime() === value[1].getTime(),
    );
    return preset?.key || null;
  }, [presets, value]);

  return (
    <Group gap={4} wrap="wrap">
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => {
            // Toggle off if already selected
            if (selectedPresetKey === preset.key) {
              onChange([null, null]);
            } else {
              onChange(preset.value);
            }
          }}
          style={{
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            border:
              selectedPresetKey === preset.key
                ? "1px solid var(--accent)"
                : "1px solid var(--border-primary)",
            backgroundColor:
              selectedPresetKey === preset.key
                ? "var(--accent-subtle)"
                : "transparent",
            color:
              selectedPresetKey === preset.key
                ? "var(--accent)"
                : "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {preset.label}
        </button>
      ))}
    </Group>
  );
}

// Section header with optional clear button
function SectionHeader({ label, count, onClear }) {
  return (
    <Group justify="space-between" gap={4}>
      <Text
        size="sm"
        c="var(--text-muted)"
        tt="uppercase"
        fw={500}
        style={{ letterSpacing: "0.04em" }}
      >
        {label}
        {count > 0 && (
          <span style={{ color: "var(--accent)", marginLeft: 4 }}>
            ({count})
          </span>
        )}
      </Text>
      {count > 0 && onClear && (
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={onClear}
          aria-label={`Clear ${label.toLowerCase()} filters`}
          title="Clear"
        >
          <IconTrash size={14} />
        </ActionIcon>
      )}
    </Group>
  );
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "var(--status-todo)" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "var(--status-progress)",
  },
  { value: "review", label: "Review", color: "var(--status-review)" },
  { value: "done", label: "Done", color: "var(--status-done)" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High", color: "var(--priority-high)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "low", label: "Low", color: "var(--priority-low)" },
];

function FilterChip({ label, color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--border-secondary)";
          e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--border-primary)";
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
      style={{
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        border: selected
          ? `1px solid ${color}`
          : "1px solid var(--border-primary)",
        backgroundColor: selected ? `${color}18` : "transparent",
        color: selected ? color : "var(--text-secondary)",
        fontSize: "var(--text-sm)",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

export function FilterPanel({
  currentUserId,
  appliedFilters,
  onApply,
  onClose,
  showHeader = true,
}) {
  const { users } = useUsers();
  const isMobile = useMobile();
  const today = dayjs();
  const datePresets = useMemo(() => getDatePresets(today), [today]);

  // Time filter mode: created vs updated
  const [timeMode, setTimeMode] = useState("created");

  // Normalize filters for consistent access
  const filters = {
    ...appliedFilters,
    createdRange: appliedFilters.createdRange || [null, null],
    updatedRange: appliedFilters.updatedRange || [null, null],
  };

  // Assignee options: Unassigned first, then all users
  const assigneeOptions = useMemo(() => {
    return [
      { value: "0", label: "Unassigned" },
      ...users.map((u) => ({ value: String(u.id), label: u.name })),
    ];
  }, [users]);

  // Count active filters per section
  const statusCount = filters.status.length;
  const priorityCount = filters.priority.length;
  const ownerCount = (filters.myIssues ? 1 : 0) + filters.assignee.length;
  const timeCount =
    (filters.createdRange[0] && filters.createdRange[1] ? 1 : 0) +
    (filters.updatedRange[0] && filters.updatedRange[1] ? 1 : 0);
  const totalCount =
    statusCount +
    priorityCount +
    ownerCount +
    timeCount +
    (filters.showArchived ? 1 : 0);

  // Instant apply helper - applies changes immediately
  const applyChange = (updates) => {
    onApply({ ...filters, ...updates });
  };

  const toggleStatus = (value) => {
    const newStatus = filters.status.includes(value)
      ? filters.status.filter((s) => s !== value)
      : [...filters.status, value];
    applyChange({ status: newStatus });
  };

  const togglePriority = (value) => {
    const newPriority = filters.priority.includes(value)
      ? filters.priority.filter((p) => p !== value)
      : [...filters.priority, value];
    applyChange({ priority: newPriority });
  };

  const setAssignees = (values) => {
    applyChange({ assignee: values || [] });
  };

  const toggleMyIssues = () => {
    applyChange({ myIssues: !filters.myIssues });
  };

  const toggleArchived = () => {
    applyChange({ showArchived: !filters.showArchived });
  };

  const setCreatedRange = (range) => {
    applyChange({ createdRange: range });
  };

  const setUpdatedRange = (range) => {
    applyChange({ updatedRange: range });
  };

  const clearSection = (section) => {
    switch (section) {
      case "status":
        applyChange({ status: [] });
        break;
      case "priority":
        applyChange({ priority: [] });
        break;
      case "owner":
        applyChange({ myIssues: false, assignee: [] });
        break;
      case "time":
        applyChange({ createdRange: [null, null], updatedRange: [null, null] });
        break;
    }
  };

  const clearAllFilters = () => {
    onApply({
      status: [],
      assignee: [],
      priority: [],
      myIssues: false,
      showArchived: false,
      createdRange: [null, null],
      updatedRange: [null, null],
    });
  };

  // Current time range based on mode
  const currentTimeRange =
    timeMode === "created" ? filters.createdRange : filters.updatedRange;
  const setCurrentTimeRange =
    timeMode === "created" ? setCreatedRange : setUpdatedRange;

  return (
    <div
      style={{
        width: 340,
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      {showHeader && (
        <Group
          justify="space-between"
          px="md"
          py={12}
          style={{
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <Group gap={8}>
            <Text size="md" fw={600} c="var(--text-primary)">
              Filters
            </Text>
            <Text
              size="xs"
              c="var(--text-muted)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {isMac ? "⌘" : "Ctrl"}+X
            </Text>
          </Group>
          <Group gap={6}>
            {totalCount > 0 && (
              <ActionIcon
                size="md"
                variant="subtle"
                color="orange"
                onClick={clearAllFilters}
                aria-label="Clear all filters"
                title="Clear all filters"
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
            <CloseButton size="sm" onClick={onClose} />
          </Group>
        </Group>
      )}

      <Stack gap={14} p="md">
        {/* STATUS section */}
        <div>
          <SectionHeader
            label="Status"
            count={statusCount}
            onClear={() => clearSection("status")}
          />
          <Group gap={6} mt={8}>
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                color={opt.color}
                selected={filters.status.includes(opt.value)}
                onClick={() => toggleStatus(opt.value)}
              />
            ))}
          </Group>
        </div>

        {/* PRIORITY section */}
        <div>
          <SectionHeader
            label="Priority"
            count={priorityCount}
            onClear={() => clearSection("priority")}
          />
          <Group gap={6} mt={8}>
            {PRIORITY_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                color={opt.color}
                selected={filters.priority.includes(opt.value)}
                onClick={() => togglePriority(opt.value)}
              />
            ))}
          </Group>
        </div>

        {/* OWNER section - combines My Issues + Assignee */}
        <div>
          <SectionHeader
            label="Owner"
            count={ownerCount}
            onClear={() => clearSection("owner")}
          />
          <Stack gap={10} mt={8}>
            <Switch
              label="My Issues Only"
              checked={filters.myIssues}
              onChange={toggleMyIssues}
              disabled={!currentUserId}
              size="md"
              styles={{
                label: {
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                },
              }}
            />
            {!filters.myIssues && (
              <MultiSelect
                data={assigneeOptions}
                value={filters.assignee}
                onChange={setAssignees}
                placeholder="Any assignee"
                searchable
                size="sm"
                comboboxProps={{ withinPortal: false }}
              />
            )}
          </Stack>
        </div>

        {/* TIME section - Created/Updated toggle + presets */}
        <div>
          <SectionHeader
            label="Time"
            count={timeCount}
            onClear={() => clearSection("time")}
          />
          <Stack gap={8} mt={8}>
            <SegmentedControl
              size="sm"
              value={timeMode}
              onChange={setTimeMode}
              data={[
                { label: "Created", value: "created" },
                { label: "Updated", value: "updated" },
              ]}
              styles={{
                root: { backgroundColor: "var(--bg-tertiary)" },
              }}
            />
            {isMobile ? (
              <DatePresetButtons
                presets={datePresets}
                value={currentTimeRange}
                onChange={setCurrentTimeRange}
              />
            ) : (
              <DatePickerInput
                type="range"
                presets={datePresets}
                value={currentTimeRange}
                onChange={setCurrentTimeRange}
                allowSingleDateInRange
                placeholder="Select range"
                firstDayOfWeek={0}
                size="sm"
                clearable
                highlightToday
                popoverProps={{ withinPortal: false }}
              />
            )}
          </Stack>
        </div>

        {/* VISIBILITY section */}
        <div
          style={{
            borderTop: "1px solid var(--border-primary)",
            paddingTop: 12,
          }}
        >
          <Switch
            label="Show Archived"
            checked={filters.showArchived}
            onChange={toggleArchived}
            size="md"
            styles={{
              label: {
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
              },
            }}
          />
        </div>
      </Stack>
    </div>
  );
}
