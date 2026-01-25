import { useState, useEffect, useMemo } from "react";
import {
  Select,
  Button,
  Group,
  Stack,
  Text,
  CloseButton,
  Checkbox,
  Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import dayjs from "dayjs";
import { useUsers } from "../../contexts/UsersContext";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "var(--status-todo)" },
  { value: "in_progress", label: "In Progress", color: "var(--status-progress)" },
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
        borderRadius: "var(--radius-md)",
        border: selected
          ? `1.5px solid ${color}`
          : "1.5px solid var(--border-primary)",
        backgroundColor: selected ? `${color}20` : "transparent",
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

export function FilterPanel({ currentUserId, appliedFilters, onApply, onClose }) {
  const { users } = useUsers();
  const today = dayjs();

  // Draft state for local edits - initialized from applied
  const [draftFilters, setDraftFilters] = useState({
    ...appliedFilters,
    createdRange: appliedFilters.createdRange || [null, null],
    updatedRange: appliedFilters.updatedRange || [null, null],
  });

  // Sync draft to applied when panel first opens or applied changes externally
  useEffect(() => {
    setDraftFilters({
      ...appliedFilters,
      createdRange: appliedFilters.createdRange || [null, null],
      updatedRange: appliedFilters.updatedRange || [null, null],
    });
  }, [appliedFilters]);

  // Assignee options: Unassigned first, then all users
  const assigneeOptions = useMemo(() => {
    return [
      { value: "0", label: "Unassigned" },
      ...users.map((u) => ({ value: String(u.id), label: u.name })),
    ];
  }, [users]);

  // Check if draft differs from applied
  const hasChanges = JSON.stringify(draftFilters) !== JSON.stringify({
    ...appliedFilters,
    createdRange: appliedFilters.createdRange || [null, null],
    updatedRange: appliedFilters.updatedRange || [null, null],
  });

  const hasActiveFilters =
    draftFilters.status.length > 0 ||
    draftFilters.assignee.length > 0 ||
    draftFilters.priority.length > 0 ||
    draftFilters.myIssues ||
    (draftFilters.createdRange[0] && draftFilters.createdRange[1]) ||
    (draftFilters.updatedRange[0] && draftFilters.updatedRange[1]);

  function handleApply() {
    onApply(draftFilters);
    onClose();
  }

  function handleCancel() {
    setDraftFilters({
      ...appliedFilters,
      createdRange: appliedFilters.createdRange || [null, null],
      updatedRange: appliedFilters.updatedRange || [null, null],
    });
    onClose();
  }

  const toggleStatus = (value) => {
    setDraftFilters((prev) => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter((s) => s !== value)
        : [...prev.status, value],
    }));
  };

  const togglePriority = (value) => {
    setDraftFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(value)
        ? prev.priority.filter((p) => p !== value)
        : [...prev.priority, value],
    }));
  };

  const setAssignee = (value) => {
    setDraftFilters((prev) => ({
      ...prev,
      assignee: value ? [value] : [],
    }));
  };

  const toggleMyIssues = () => {
    setDraftFilters((prev) => ({ ...prev, myIssues: !prev.myIssues }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      status: [],
      assignee: [],
      priority: [],
      myIssues: false,
      createdRange: [null, null],
      updatedRange: [null, null],
    };
    onApply(clearedFilters);
    onClose();
  };

  return (
    <div
      style={{
        width: 280,
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-primary)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Header */}
      <Group
        justify="space-between"
        p="sm"
        style={{
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <Text size="sm" fw={600} c="var(--text-primary)">
          Filters
        </Text>
        <CloseButton size="sm" onClick={handleCancel} />
      </Group>

      <Stack gap="md" p="sm">
        {/* Status chips */}
        <div>
          <Text size="xs" c="var(--text-muted)" mb={8} tt="uppercase" fw={500}>
            Status
          </Text>
          <Group gap={6}>
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                color={opt.color}
                selected={draftFilters.status.includes(opt.value)}
                onClick={() => toggleStatus(opt.value)}
              />
            ))}
          </Group>
        </div>

        {/* Priority chips */}
        <div>
          <Text size="xs" c="var(--text-muted)" mb={8} tt="uppercase" fw={500}>
            Priority
          </Text>
          <Group gap={6}>
            {PRIORITY_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                color={opt.color}
                selected={draftFilters.priority.includes(opt.value)}
                onClick={() => togglePriority(opt.value)}
              />
            ))}
          </Group>
        </div>

        {/* Assignee dropdown */}
        <div>
          <Text size="xs" c="var(--text-muted)" mb={8} tt="uppercase" fw={500}>
            Assignee
          </Text>
          <Select
            data={assigneeOptions}
            value={draftFilters.assignee[0] || null}
            onChange={setAssignee}
            placeholder="Anyone"
            searchable
            clearable
            size="sm"
            comboboxProps={{ withinPortal: false }}
          />
        </div>

        {/* Created Date Range */}
        <div>
          <Text size="xs" c="var(--text-muted)" mb={8} tt="uppercase" fw={500}>
            Created Date
          </Text>
          <DatePickerInput
            type="range"
            presets={[
              {
                value: [today.subtract(2, "day").toDate(), today.toDate()],
                label: "Last two days",
              },
              {
                value: [today.subtract(7, "day").toDate(), today.toDate()],
                label: "Last 7 days",
              },
              {
                value: [today.startOf("month").toDate(), today.toDate()],
                label: "This month",
              },
              {
                value: [
                  today.subtract(1, "month").startOf("month").toDate(),
                  today.subtract(1, "month").endOf("month").toDate(),
                ],
                label: "Last month",
              },
              {
                value: [
                  today.subtract(1, "year").startOf("year").toDate(),
                  today.subtract(1, "year").endOf("year").toDate(),
                ],
                label: "Last year",
              },
            ]}
            value={draftFilters.createdRange}
            onChange={(range) =>
              setDraftFilters((prev) => ({ ...prev, createdRange: range }))
            }
            allowSingleDateInRange
            placeholder="Select date range"
            firstDayOfWeek={0}
            size="sm"
            clearable
            highlightToday
            popoverProps={{ withinPortal: false }}
          />
        </div>

        {/* Updated Date Range */}
        <div>
          <Text size="xs" c="var(--text-muted)" mb={8} tt="uppercase" fw={500}>
            Updated Date
          </Text>
          <DatePickerInput
            type="range"
            presets={[
              {
                value: [today.subtract(2, "day").toDate(), today.toDate()],
                label: "Last two days",
              },
              {
                value: [today.subtract(7, "day").toDate(), today.toDate()],
                label: "Last 7 days",
              },
              {
                value: [today.startOf("month").toDate(), today.toDate()],
                label: "This month",
              },
              {
                value: [
                  today.subtract(1, "month").startOf("month").toDate(),
                  today.subtract(1, "month").endOf("month").toDate(),
                ],
                label: "Last month",
              },
              {
                value: [
                  today.subtract(1, "year").startOf("year").toDate(),
                  today.subtract(1, "year").endOf("year").toDate(),
                ],
                label: "Last year",
              },
            ]}
            value={draftFilters.updatedRange}
            onChange={(range) =>
              setDraftFilters((prev) => ({ ...prev, updatedRange: range }))
            }
            placeholder="Select date range"
            allowSingleDateInRange
            firstDayOfWeek={0}
            size="sm"
            clearable
            highlightToday
            popoverProps={{ withinPortal: false }}
          />
        </div>

        <Divider color="var(--border-primary)" />

        {/* My Issues toggle */}
        <Checkbox
          label="My Issues Only"
          checked={draftFilters.myIssues}
          onChange={toggleMyIssues}
          disabled={!currentUserId}
          size="sm"
        />

        {/* Apply/Cancel buttons */}
        <Group justify="space-between" mt="xs">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Group gap="xs">
            {hasActiveFilters && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={clearAllFilters}
              >
                Clear
              </Button>
            )}
            <Button
              color="violet"
              size="xs"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              Apply
            </Button>
          </Group>
        </Group>
      </Stack>
    </div>
  );
}
