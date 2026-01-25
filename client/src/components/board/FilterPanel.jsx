import { useState, useEffect, useMemo } from "react";
import { MultiSelect, Button, Group, Collapse, Box } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQueryParams } from "../../hooks/useQueryParams";
import { useUsers } from "../../contexts/UsersContext";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function FilterPanel({ expanded, currentUserId, onFiltersChange }) {
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

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
    <Collapse in={expanded}>
      <Box
        p="sm"
        mb="sm"
        style={{
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Group gap="sm" wrap="wrap">
          <MultiSelect
            data={STATUS_OPTIONS}
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            placeholder="Status"
            searchable
            clearable
            size="sm"
            style={{ minWidth: 150 }}
          />

          <MultiSelect
            data={assigneeOptions}
            value={filters.assignee}
            onChange={(value) => updateFilter("assignee", value)}
            placeholder="Assignee"
            searchable
            clearable
            size="sm"
            style={{ minWidth: 150 }}
          />

          <MultiSelect
            data={PRIORITY_OPTIONS}
            value={filters.priority}
            onChange={(value) => updateFilter("priority", value)}
            placeholder="Priority"
            searchable
            clearable
            size="sm"
            style={{ minWidth: 150 }}
          />

          <Button
            variant={filters.myIssues ? "filled" : "light"}
            color={filters.myIssues ? "blue" : "gray"}
            size="sm"
            onClick={toggleMyIssues}
            disabled={!currentUserId}
          >
            My Issues
          </Button>

          {hasActiveFilters && (
            <Button
              variant="subtle"
              color="red"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          )}
        </Group>
      </Box>
    </Collapse>
  );
}
