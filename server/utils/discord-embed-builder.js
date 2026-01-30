/**
 * Discord Embed Builder
 *
 * Transforms MiniJira events into rich Discord embeds with color coding,
 * field formatting, and change presentation.
 */

/**
 * Get Discord embed color for a given status
 * @param {string} status - Issue status or special event type
 * @returns {number} Decimal color integer for Discord
 */
export function getStatusColor(status) {
  const colors = {
    done: '#57F287',          // Bright green - celebratory success
    in_progress: '#FEE75C',   // Yellow - active work
    review: '#5865F2',        // Blurple - review state
    todo: '#99AAB5',          // Gray - neutral, not started
    deleted: '#ED4245',       // Red - destructive action
    comment: '#5865F2',       // Blurple - comment notifications
  };

  const hex = colors[status] || colors.todo;
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Truncate text with ellipsis if over limit
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} Truncated text or original if under limit
 */
export function truncate(text, maxLength = 200) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format value for human-readable display
 * @param {any} val - Value to format
 * @param {string} type - Type of value (status, priority, assignee, etc.)
 * @returns {string} Formatted value
 */
export function formatValue(val, type) {
  if (!val) return val;

  if (type === 'status') {
    const statusMap = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    return statusMap[val] || val;
  }

  if (type === 'priority') {
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  return val;
}

/**
 * Format a change from old to new value using Discord markdown
 * @param {any} oldVal - Previous value
 * @param {any} newVal - New value
 * @param {string} type - Type of value for formatting
 * @returns {string} Formatted change string with Discord markdown
 */
export function formatChange(oldVal, newVal, type = null) {
  const isEmpty = (v) => v === null || v === undefined || v === '';

  // Special handling for assignee changes with multiple people
  if (type === 'assignee') {
    const formatAssignees = (val) => {
      if (isEmpty(val)) return null;
      // If it's a comma-separated list, format nicely
      if (typeof val === 'string' && val.includes(',')) {
        const names = val.split(',').map(n => n.trim());
        if (names.length === 2) {
          return `${names[0]} and ${names[1]}`;
        } else if (names.length > 2) {
          return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
        }
      }
      return val;
    };

    const formattedOld = formatAssignees(oldVal);
    const formattedNew = formatAssignees(newVal);

    if (isEmpty(oldVal) && !isEmpty(newVal)) {
      return `Assigned to: **${formattedNew}**`;
    }

    if (!isEmpty(oldVal) && isEmpty(newVal)) {
      return `Unassigned (was: ~~${formattedOld}~~)`;
    }

    return `~~${formattedOld}~~ → **${formattedNew}**`;
  }

  if (isEmpty(oldVal) && !isEmpty(newVal)) {
    // Empty to value: "Set to: **X**"
    return `Set to: **${formatValue(newVal, type)}**`;
  }

  if (!isEmpty(oldVal) && isEmpty(newVal)) {
    // Value to empty: "Cleared (was: ~~X~~)"
    return `Cleared (was: ~~${formatValue(oldVal, type)}~~)`;
  }

  // Value to value: "~~X~~ → **Y**"
  return `~~${formatValue(oldVal, type)}~~ → **${formatValue(newVal, type)}**`;
}

/**
 * Format field name for display
 * Capitalizes first letter and replaces underscores with spaces
 * @param {string} type - Field type (e.g., 'description_changed')
 * @returns {string} Formatted name (e.g., 'Description Changed')
 */
function formatFieldName(type) {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Emoji mapping for field types
 */
const fieldEmojis = {
  status: '🔄',
  assignee: '👤',
  priority: '🎯',
  description: '📝',
  comment: '💬',
  created: '✨',
  deleted: '🗑️',
  due_date: '📅',
  subtasks: '📊'
};

/**
 * Get emoji for a field type
 * @param {string} type - Field type
 * @returns {string} Emoji or empty string if not found
 */
function getFieldEmoji(type) {
  return fieldEmojis[type] || '';
}

/**
 * Build Discord fields array from changes
 * @param {Array} changes - Array of {type, old, new, value?, isSubtask?, title?, subtaskKey?}
 * @returns {Array} Discord fields with name, value, inline (always false for block layout)
 */
export function formatChangeFields(changes) {
  if (!changes || changes.length === 0) {
    return [];
  }

  // Define field order: created/deleted first, then assignee, status, priority, then others
  const orderPriority = {
    created: 1,
    deleted: 1,
    assignee: 2,
    status: 3,
    priority: 4
  };

  // Sort changes by priority
  const sortedChanges = [...changes].sort((a, b) => {
    const aPriority = orderPriority[a.type] || 999;
    const bPriority = orderPriority[b.type] || 999;
    return aPriority - bPriority;
  });

  return sortedChanges.map(change => {
    const { type, old, new: newVal, value, isSubtask, title, subtaskKey } = change;

    // Handle comment fields
    if (type === 'comment') {
      const emoji = getFieldEmoji('comment');
      return {
        name: `${emoji} Comment Added`,
        value: truncate(value || newVal || '', 200),
        inline: false
      };
    }

    // Handle created events
    if (type === 'created') {
      const emoji = getFieldEmoji('created');
      const prefix = isSubtask && subtaskKey ? `└─ [${subtaskKey}] ` : '';
      const itemType = isSubtask ? 'Subtask Created' : 'Issue Created';
      return {
        name: `${prefix}${emoji} ${itemType}`,
        value: title ? `"${truncate(title, 100)}"` : 'New item',
        inline: false
      };
    }

    // Handle deleted events
    if (type === 'deleted') {
      const emoji = getFieldEmoji('deleted');
      const prefix = isSubtask && subtaskKey ? `└─ [${subtaskKey}] ` : '';
      const itemType = isSubtask ? 'Subtask Deleted' : 'Issue Deleted';
      return {
        name: `${prefix}${emoji} ${itemType}`,
        value: title ? `"${truncate(title, 100)}"` : 'Item removed',
        inline: false
      };
    }

    // Get emoji for field type
    const emoji = getFieldEmoji(type);
    const emojiPrefix = emoji ? `${emoji} ` : '';

    // Format field name (capitalize and replace underscores)
    let fieldName = formatFieldName(type);

    // Prefix with └─ [subtaskKey] for subtask field changes
    if (isSubtask && subtaskKey) {
      fieldName = `└─ [${subtaskKey}] ${emojiPrefix}${fieldName}`;
    } else {
      fieldName = `${emojiPrefix}${fieldName}`;
    }

    // Format the change
    const fieldValue = formatChange(old, newVal, type);

    // Always use block fields (inline: false)
    return {
      name: fieldName,
      value: fieldValue,
      inline: false
    };
  });
}

/**
 * Parse timestamp ensuring UTC interpretation
 * SQLite datetime() returns UTC without timezone indicator (e.g., "2026-01-24 16:26:00")
 * JavaScript's Date() would parse this as local time, causing incorrect times
 * @param {string|Date} timestamp - ISO 8601 timestamp or SQLite datetime string
 * @returns {Date} Date object with correct UTC interpretation
 */
function parseTimestamp(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // If timestamp doesn't have timezone indicator, treat as UTC
  if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+') && !timestamp.includes('-', 10)) {
    return new Date(timestamp + 'Z');
  }
  return new Date(timestamp);
}

/**
 * Format timestamp as Discord relative time syntax
 * @param {string|Date} timestamp - ISO 8601 timestamp or SQLite datetime string
 * @returns {string} Discord timestamp syntax (e.g., "<t:1706123456:R>" renders as "2 minutes ago")
 */
function formatDiscordRelativeTime(timestamp) {
  const date = parseTimestamp(timestamp);
  const unixSeconds = Math.floor(date.getTime() / 1000);
  return `<t:${unixSeconds}:R>`;
}

/**
 * Build complete Discord embed object
 * @param {Object} issue - Issue object with id, key, title, status
 * @param {Array} changes - Array of change objects
 * @param {Object} user - User object with name
 * @param {string} timestamp - ISO 8601 timestamp
 * @param {Object} options - Optional settings (deleted, subtaskSummary, description, descriptionChanged, etc.)
 * @returns {Object} Discord webhook payload with embeds array
 */
export function buildEmbed(issue, changes, user, timestamp, options = {}) {
  // Determine embed color based on status or event type
  let color;
  if (options.deleted) {
    color = getStatusColor('deleted');
  } else if (changes.length === 1 && changes[0].type === 'comment') {
    color = getStatusColor('comment');
  } else {
    color = getStatusColor(issue.status);
  }

  // Build fields array from changes
  const fields = formatChangeFields(changes);

  // Add subtask summary if provided
  if (options.subtaskSummary) {
    fields.push({
      name: `${getFieldEmoji('subtasks')} Subtasks`,
      value: options.subtaskSummary,
      inline: false
    });
  }

  // Add description if:
  // 1. This is issue creation and description exists, OR
  // 2. Description was changed (options.descriptionChanged)
  if (options.description && (options.eventType === 'issue_created' || options.descriptionChanged)) {
    fields.push({
      name: `${getFieldEmoji('description')} Description`,
      value: truncate(options.description, 500),
      inline: false
    });
  }

  // Build title with optional subtask indicator
  let title = `[${issue.key}] ${issue.title}`;
  if (options.isSubtask) {
    title += ' (Subtask)';
  }

  // Build the embed object
  const embed = {
    title: title,
    url: `${process.env.APP_URL || 'http://localhost:5173'}/issues/${issue.id}`,
    description: formatDiscordRelativeTime(timestamp),
    color: color,
    fields: fields,
    footer: {
      text: `Changed by ${user.name}`
    }
  };

  return {
    embeds: [embed]
  };
}
