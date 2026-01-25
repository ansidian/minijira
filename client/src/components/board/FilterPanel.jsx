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
import { useDebouncedValue } from "@mantine/hooks";
import { useQueryParams } from "../../hooks/useQueryParams";
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
        border: selected ? `1.5px solid ${color}` : "1.5px solid var(--border-primary)",
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

export function FilterPanel({ currentUserId, onFiltersChange, onClose }) {
  const [params, setParams] = useQueryParams();
  const { users } = useUsers();

  // Assignee options: Unassigned first, then all users
  const assigneeOptions = useMemo(() => {
    return [
      { value: "0", label: "Unassigned" },
      ...users.map((u) => ({ value: String(u.id), label: u.name })),
    ];
  }, [users]);

  // Initialize from URL
  const [filters, setFilters] = useState(() => ({
    status: params.getAll("status"),
    assignee: params.getAll("assignee"),
    priority: params.getAll("priority"),
    myIssues: params.get("my") === "true",
  }));

  const [debouncedFilters] = useDebouncedValue(filters, 300);

  // Sync debounced filters to URL and notify parent
  useEffect(() => {
    setParams({
      status: debouncedFilters.status.length ? debouncedFilters.status : null,
      assignee: debouncedFilters.assignee.length
        ? debouncedFilters.assignee
        : null,
      priority: debouncedFilters.priority.length
        ? debouncedFilters.priority
        : null,
      my: debouncedFilters.myIssues ? "true" : null,
    });
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, setParams, onFiltersChange]);

  // Listen for URL changes (browser back/forward) and sync to local state
  useEffect(() => {
    const newFilters = {
      status: params.getAll("status"),
      assignee: params.getAll("assignee"),
      priority: params.getAll("priority"),
      myIssues: params.get("my") === "true",
    };

    // Only update if actually different to avoid loops
    const isDifferent =
      JSON.stringify(newFilters) !== JSON.stringify(filters);

    if (isDifferent) {
      setFilters(newFilters);
    }
  }, [params]);

  const toggleStatus = (value) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter((s) => s !== value)
        : [...prev.status, value],
    }));
  };

  const togglePriority = (value) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(value)
        ? prev.priority.filter((p) => p !== value)
        : [...prev.priority, value],
    }));
  };

  const setAssignee = (value) => {
    setFilters((prev) => ({
      ...prev,
      assignee: value ? [value] : [],
    }));
  };

  const toggleMyIssues = () => {
    setFilters((prev) => ({ ...prev, myIssues: !prev.myIssues }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: [],
      assignee: [],
      priority: [],
      myIssues: false,
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.assignee.length > 0 ||
    filters.priority.length > 0 ||
    filters.myIssues;

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
        <CloseButton size="sm" onClick={onClose} />
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
                selected={filters.status.includes(opt.value)}
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
                selected={filters.priority.includes(opt.value)}
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
            value={filters.assignee[0] || null}
            onChange={setAssignee}
            placeholder="Anyone"
            searchable
            clearable
            size="sm"
            comboboxProps={{ withinPortal: false }}
          />
        </div>

        <Divider color="var(--border-primary)" />

        {/* My Issues toggle */}
        <Checkbox
          label="My Issues Only"
          checked={filters.myIssues}
          onChange={toggleMyIssues}
          disabled={!currentUserId}
          size="sm"
        />

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="subtle"
            color="violet"
            size="xs"
            fullWidth
            onClick={clearAllFilters}
          >
            Clear All Filters
          </Button>
        )}
      </Stack>
    </div>
  );
}
