const issueSelectColumns = `
  issues.*,
  GROUP_CONCAT(DISTINCT assignees.id) as assignee_ids,
  GROUP_CONCAT(DISTINCT assignees.name) as assignee_names,
  GROUP_CONCAT(DISTINCT assignees.avatar_color) as assignee_colors,
  reporter.name as reporter_name,
  parent.key as parent_key
`;

const issueSelectColumnsWithCounts = `
  ${issueSelectColumns},
  (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id) as subtask_count,
  (SELECT COUNT(*) FROM issues sub WHERE sub.parent_id = issues.id AND sub.status = 'done') as subtask_done_count
`;

const issueJoins = `
  FROM issues
  LEFT JOIN issue_assignees ia ON issues.id = ia.issue_id
  LEFT JOIN users assignees ON ia.user_id = assignees.id
  LEFT JOIN users reporter ON issues.reporter_id = reporter.id
  LEFT JOIN issues parent ON issues.parent_id = parent.id
`;

const subtaskSelectColumns = `
  issues.*,
  GROUP_CONCAT(DISTINCT assignees.id) as assignee_ids,
  GROUP_CONCAT(DISTINCT assignees.name) as assignee_names,
  GROUP_CONCAT(DISTINCT assignees.avatar_color) as assignee_colors,
  parent.key as parent_key
`;

const subtaskJoins = `
  FROM issues
  LEFT JOIN issue_assignees ia ON issues.id = ia.issue_id
  LEFT JOIN users assignees ON ia.user_id = assignees.id
  LEFT JOIN issues parent ON issues.parent_id = parent.id
`;

export const issueSelect = `
  SELECT
    ${issueSelectColumns}
  ${issueJoins}
`;

export const issueSelectWithCounts = `
  SELECT
    ${issueSelectColumnsWithCounts}
  ${issueJoins}
`;

export const subtaskSelect = `
  SELECT
    ${subtaskSelectColumns}
  ${subtaskJoins}
`;

/**
 * Transform issue row from database query to include assignees as array.
 * Parses GROUP_CONCAT strings into structured assignee objects.
 */
export function transformIssueRow(row) {
  if (!row) return row;

  const assigneeIds = row.assignee_ids ? row.assignee_ids.split(',').map(Number) : [];
  const assigneeNames = row.assignee_names ? row.assignee_names.split(',') : [];
  const assigneeColors = row.assignee_colors ? row.assignee_colors.split(',') : [];

  const assignees = assigneeIds.map((id, index) => ({
    id,
    name: assigneeNames[index] || '',
    avatar_color: assigneeColors[index] || '#6366f1'
  }));

  // Remove the concatenated fields and add structured assignees array
  const { assignee_ids, assignee_names, assignee_colors, assignee_id, assignee_name, assignee_color, ...rest } = row;

  return {
    ...rest,
    assignees,
    // For backwards compatibility, also include first assignee as assignee_id/name/color
    assignee_id: assignees[0]?.id || null,
    assignee_name: assignees[0]?.name || null,
    assignee_color: assignees[0]?.avatar_color || null,
  };
}

/**
 * Transform array of issue rows
 */
export function transformIssueRows(rows) {
  return rows.map(transformIssueRow);
}
