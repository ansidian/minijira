const issueSelectColumns = `
  issues.*,
  assignee.name as assignee_name,
  assignee.avatar_color as assignee_color,
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
  LEFT JOIN users assignee ON issues.assignee_id = assignee.id
  LEFT JOIN users reporter ON issues.reporter_id = reporter.id
  LEFT JOIN issues parent ON issues.parent_id = parent.id
`;

const subtaskSelectColumns = `
  issues.*,
  assignee.name as assignee_name,
  assignee.avatar_color as assignee_color,
  parent.key as parent_key
`;

const subtaskJoins = `
  FROM issues
  LEFT JOIN users assignee ON issues.assignee_id = assignee.id
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
