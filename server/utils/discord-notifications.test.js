/**
 * Discord Notification System Tests
 *
 * Tests the embed builder, payload merging, and subtask batching logic.
 * Run with: node --test server/utils/discord-notifications.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  getStatusColor,
  truncate,
  formatValue,
  formatChange,
  formatChangeFields,
  buildEmbed
} from './discord-embed-builder.js';

import { extractChangesFromPayload } from './discord-sender.js';

// ============================================================================
// discord-embed-builder.js tests
// ============================================================================

describe('getStatusColor', () => {
  it('returns correct colors for known statuses', () => {
    assert.strictEqual(getStatusColor('done'), 0x57F287);
    assert.strictEqual(getStatusColor('in_progress'), 0xFEE75C);
    assert.strictEqual(getStatusColor('deleted'), 0xED4245);
  });

  it('returns gray for unknown status', () => {
    assert.strictEqual(getStatusColor('unknown'), 0x99AAB5);
  });
});

describe('truncate', () => {
  it('returns short text unchanged', () => {
    assert.strictEqual(truncate('hello', 200), 'hello');
  });

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(250);
    const result = truncate(long, 200);
    assert.strictEqual(result.length, 200);
    assert.ok(result.endsWith('...'));
  });

  it('handles null/undefined', () => {
    assert.strictEqual(truncate(null), null);
    assert.strictEqual(truncate(undefined), undefined);
  });
});

describe('formatValue', () => {
  it('formats status values', () => {
    assert.strictEqual(formatValue('todo', 'status'), 'To Do');
    assert.strictEqual(formatValue('in_progress', 'status'), 'In Progress');
    assert.strictEqual(formatValue('done', 'status'), 'Done');
  });

  it('capitalizes priority values', () => {
    assert.strictEqual(formatValue('high', 'priority'), 'High');
    assert.strictEqual(formatValue('low', 'priority'), 'Low');
  });

  it('returns other values unchanged', () => {
    assert.strictEqual(formatValue('John Doe', 'assignee'), 'John Doe');
  });
});

describe('formatChange', () => {
  it('formats empty to value as "Set to"', () => {
    assert.strictEqual(formatChange(null, 'high', 'priority'), 'Set to: High');
    assert.strictEqual(formatChange('', 'John', 'assignee'), 'Set to: John');
  });

  it('formats value to empty as "Cleared"', () => {
    assert.strictEqual(formatChange('high', null, 'priority'), 'Cleared (was: High)');
  });

  it('formats value to value with arrow', () => {
    assert.strictEqual(formatChange('todo', 'done', 'status'), 'To Do → Done');
    assert.strictEqual(formatChange('low', 'high', 'priority'), 'Low → High');
  });
});

describe('formatChangeFields', () => {
  it('returns empty array for no changes', () => {
    assert.deepStrictEqual(formatChangeFields([]), []);
    assert.deepStrictEqual(formatChangeFields(null), []);
  });

  it('formats comment as "Comment Added"', () => {
    const changes = [{ type: 'comment', value: 'This is a comment' }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields.length, 1);
    assert.strictEqual(fields[0].name, 'Comment Added');
    assert.strictEqual(fields[0].value, 'This is a comment');
    assert.strictEqual(fields[0].inline, false);
  });

  it('formats issue created', () => {
    const changes = [{ type: 'created', isSubtask: false, title: 'New feature' }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'Issue Created');
    assert.strictEqual(fields[0].value, '"New feature"');
  });

  it('formats subtask created', () => {
    const changes = [{ type: 'created', isSubtask: true, title: 'Sub task' }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'Subtask Created');
    assert.strictEqual(fields[0].value, '"Sub task"');
  });

  it('formats subtask deleted', () => {
    const changes = [{ type: 'deleted', isSubtask: true, title: 'Old subtask' }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'Subtask Deleted');
    assert.strictEqual(fields[0].value, '"Old subtask"');
  });

  it('formats field names with underscores as spaces', () => {
    // Simulate a 'description_changed' type field
    const changes = [{ type: 'description_changed', old: 'old desc', new: 'new desc' }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'Description Changed');
  });

  it('prefixes subtask field changes with subtask key', () => {
    const changes = [{
      type: 'status',
      old: 'todo',
      new: 'done',
      isSubtask: true,
      subtaskKey: 'JPL-465'
    }];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'JPL-465 Status');
    assert.strictEqual(fields[0].value, 'To Do → Done');
    assert.strictEqual(fields[0].inline, false); // subtask changes not inline
  });

  it('sorts fields by priority: assignee, status, priority, then others', () => {
    const changes = [
      { type: 'priority', old: 'low', new: 'high' },
      { type: 'assignee', old: null, new: 'Bob' },
      { type: 'status', old: 'todo', new: 'in_progress' }
    ];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].name, 'Assignee');
    assert.strictEqual(fields[1].name, 'Status');
    assert.strictEqual(fields[2].name, 'Priority');
  });

  it('sets inline true for assignee/status/priority on parent issues', () => {
    const changes = [
      { type: 'status', old: 'todo', new: 'done' }
    ];
    const fields = formatChangeFields(changes);

    assert.strictEqual(fields[0].inline, true);
  });
});

describe('buildEmbed', () => {
  const mockIssue = { id: 1, key: 'JPL-464', title: 'Test issue', status: 'todo' };
  const mockUser = { name: 'Andy Su' };
  const mockTimestamp = '2026-01-24 16:30:00'; // UTC without Z

  it('builds embed with correct structure', () => {
    const changes = [{ type: 'status', old: 'todo', new: 'done' }];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);

    assert.ok(result.embeds);
    assert.strictEqual(result.embeds.length, 1);

    const embed = result.embeds[0];
    assert.strictEqual(embed.title, '[JPL-464] Test issue');
    assert.ok(embed.url.includes('/issues/1'));
    assert.ok(embed.footer.text.includes('Andy Su'));
  });

  it('parses UTC timestamp correctly for Discord relative time', () => {
    const changes = [];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);
    const embed = result.embeds[0];

    // Discord relative time format: <t:UNIX_SECONDS:R>
    assert.match(embed.description, /^<t:\d+:R>$/);

    // Extract unix timestamp and verify it's reasonable
    const unixMatch = embed.description.match(/<t:(\d+):R>/);
    const unixSeconds = parseInt(unixMatch[1]);

    // 2026-01-24 16:30:00 UTC should be around 1769270000
    assert.ok(unixSeconds > 1700000000, 'Unix timestamp should be in the future');
    assert.ok(unixSeconds < 1900000000, 'Unix timestamp should be reasonable');
  });

  it('formats footer timestamp in PST', () => {
    const changes = [];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);
    const embed = result.embeds[0];

    assert.ok(embed.footer.text.includes('PST'));
    // 16:30 UTC = 8:30 AM PST
    assert.ok(embed.footer.text.includes('8:30 AM'),
      `Expected 8:30 AM PST, got: ${embed.footer.text}`);
  });

  it('uses deleted color when deleted option is true', () => {
    const changes = [{ type: 'deleted', isSubtask: false, title: 'Deleted issue' }];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp, { deleted: true });

    assert.strictEqual(result.embeds[0].color, 0xED4245);
  });

  it('uses comment color for comment-only embeds', () => {
    const changes = [{ type: 'comment', value: 'A comment' }];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);

    assert.strictEqual(result.embeds[0].color, 0x5865F2);
  });

  it('includes subtask summary when provided', () => {
    const changes = [{ type: 'status', old: 'todo', new: 'done' }];
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp, {
      subtaskSummary: '2/3 subtasks done'
    });

    const subtaskField = result.embeds[0].fields.find(f => f.name === 'Subtasks');
    assert.ok(subtaskField);
    assert.strictEqual(subtaskField.value, '2/3 subtasks done');
  });
});

// ============================================================================
// discord-sender.js tests
// ============================================================================

describe('extractChangesFromPayload', () => {
  it('extracts comment changes', () => {
    const payload = { action_type: 'comment_added', comment_body: 'Hello world' };
    const changes = extractChangesFromPayload(payload, 'comment');

    assert.strictEqual(changes.length, 1);
    assert.strictEqual(changes[0].type, 'comment');
    assert.strictEqual(changes[0].value, 'Hello world');
  });

  it('extracts issue created with isSubtask=false', () => {
    const payload = { action_type: 'issue_created', issue_title: 'New issue' };
    const changes = extractChangesFromPayload(payload, 'create');

    assert.strictEqual(changes[0].type, 'created');
    assert.strictEqual(changes[0].isSubtask, false);
    assert.strictEqual(changes[0].title, 'New issue');
  });

  it('extracts subtask created with isSubtask=true', () => {
    const payload = { action_type: 'subtask_created', issue_title: 'New subtask' };
    const changes = extractChangesFromPayload(payload, 'create');

    assert.strictEqual(changes[0].type, 'created');
    assert.strictEqual(changes[0].isSubtask, true);
    assert.strictEqual(changes[0].title, 'New subtask');
  });

  it('extracts subtask deleted with isSubtask=true', () => {
    const payload = { action_type: 'subtask_deleted', issue_title: 'Old subtask' };
    const changes = extractChangesFromPayload(payload, 'delete');

    assert.strictEqual(changes[0].type, 'deleted');
    assert.strictEqual(changes[0].isSubtask, true);
  });

  it('extracts subtask_updated with nested changes', () => {
    const payload = {
      action_type: 'subtask_updated',
      issue_key: 'JPL-465',
      changes: [
        { action_type: 'status_changed', old_value: 'todo', new_value: 'done' },
        { action_type: 'priority_changed', old_value: 'low', new_value: 'high' }
      ]
    };
    const changes = extractChangesFromPayload(payload, 'update');

    assert.strictEqual(changes.length, 2);

    assert.strictEqual(changes[0].type, 'status');
    assert.strictEqual(changes[0].old, 'todo');
    assert.strictEqual(changes[0].new, 'done');
    assert.strictEqual(changes[0].isSubtask, true);
    assert.strictEqual(changes[0].subtaskKey, 'JPL-465');

    assert.strictEqual(changes[1].type, 'priority');
    assert.strictEqual(changes[1].isSubtask, true);
  });

  it('extracts standard update with old/new values', () => {
    const payload = {
      action_type: 'status_changed',
      old_value: 'todo',
      new_value: 'in_progress'
    };
    const changes = extractChangesFromPayload(payload, 'update');

    assert.strictEqual(changes[0].type, 'status');
    assert.strictEqual(changes[0].old, 'todo');
    assert.strictEqual(changes[0].new, 'in_progress');
  });

  it('handles grouped events (changes array at top level)', () => {
    const payload = {
      changes: [
        { action_type: 'status_changed', old_value: 'todo', new_value: 'done' },
        { action_type: 'assignee_changed', old_value: null, new_value: 'Bob' }
      ]
    };
    const changes = extractChangesFromPayload(payload, 'update');

    assert.strictEqual(changes.length, 2);
    assert.strictEqual(changes[0].type, 'status');
    assert.strictEqual(changes[1].type, 'assignee');
  });
});

// ============================================================================
// Integration tests - full embed generation
// ============================================================================

describe('Integration: Full embed generation', () => {
  const mockIssue = { id: 1, key: 'JPL-464', title: 'Parent issue', status: 'in_progress' };
  const mockUser = { name: 'Andy Su' };
  const mockTimestamp = '2026-01-24 16:30:00';

  it('generates correct embed for merged parent + subtask changes', () => {
    // Simulates a merged payload after batching
    const mergedPayload = {
      changes: [
        { action_type: 'status_changed', old_value: 'todo', new_value: 'in_progress' },
        { action_type: 'subtask_created', issue_title: 'testing subtasks', is_subtask: true }
      ]
    };

    const changes = extractChangesFromPayload(mergedPayload, 'update');
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);

    const embed = result.embeds[0];

    // Should have 2 fields: status change and subtask created
    assert.strictEqual(embed.fields.length, 2);

    // Status field
    const statusField = embed.fields.find(f => f.name === 'Status');
    assert.ok(statusField);
    assert.strictEqual(statusField.value, 'To Do → In Progress');

    // Subtask created field
    const subtaskField = embed.fields.find(f => f.name === 'Subtask Created');
    assert.ok(subtaskField);
    assert.strictEqual(subtaskField.value, '"testing subtasks"');
  });

  it('generates correct embed for subtask field changes', () => {
    const payload = {
      action_type: 'subtask_updated',
      issue_key: 'JPL-465',
      changes: [
        { action_type: 'status_changed', old_value: 'todo', new_value: 'done' }
      ]
    };

    const changes = extractChangesFromPayload(payload, 'update');
    const result = buildEmbed(mockIssue, changes, mockUser, mockTimestamp);

    const embed = result.embeds[0];

    // Should show "JPL-465 Status" not just "Status"
    assert.strictEqual(embed.fields[0].name, 'JPL-465 Status');
    assert.strictEqual(embed.fields[0].value, 'To Do → Done');
    assert.strictEqual(embed.fields[0].inline, false);
  });
});

// ============================================================================
// Payload merging tests (notification-queue.js logic)
// ============================================================================

describe('Payload merging logic', () => {
  // Replicate mergePayloads function for testing
  function mergePayloads(existingPayload, newPayload) {
    let changes = existingPayload.changes || [existingPayload];
    const existingIndex = changes.findIndex(c => c.action_type === newPayload.action_type);

    if (existingIndex >= 0) {
      changes[existingIndex] = newPayload;
    } else {
      changes.push(newPayload);
    }

    return { changes };
  }

  it('converts single event to changes array', () => {
    const existing = { action_type: 'status_changed', old_value: 'todo', new_value: 'in_progress' };
    const newEvent = { action_type: 'priority_changed', old_value: 'low', new_value: 'high' };

    const merged = mergePayloads(existing, newEvent);

    assert.ok(Array.isArray(merged.changes));
    assert.strictEqual(merged.changes.length, 2);
  });

  it('deduplicates by action_type (keeps latest)', () => {
    const existing = { action_type: 'status_changed', old_value: 'todo', new_value: 'in_progress' };
    const newEvent = { action_type: 'status_changed', old_value: 'todo', new_value: 'done' };

    const merged = mergePayloads(existing, newEvent);

    assert.strictEqual(merged.changes.length, 1);
    assert.strictEqual(merged.changes[0].new_value, 'done');
  });

  it('accumulates different change types', () => {
    let payload = { action_type: 'status_changed', old_value: 'todo', new_value: 'in_progress' };

    payload = mergePayloads(payload, { action_type: 'priority_changed', old_value: 'low', new_value: 'high' });
    payload = mergePayloads(payload, { action_type: 'assignee_changed', old_value: null, new_value: 'Bob' });
    payload = mergePayloads(payload, { action_type: 'subtask_created', issue_title: 'New subtask' });

    assert.strictEqual(payload.changes.length, 4);
  });

  it('handles subtask events merged with parent events', () => {
    let payload = { action_type: 'status_changed', old_value: 'todo', new_value: 'done' };

    // Subtask created under same parent
    payload = mergePayloads(payload, {
      action_type: 'subtask_created',
      issue_title: 'Subtask 1',
      is_subtask: true
    });

    assert.strictEqual(payload.changes.length, 2);
    assert.strictEqual(payload.changes[0].action_type, 'status_changed');
    assert.strictEqual(payload.changes[1].action_type, 'subtask_created');
  });
});

console.log('Running Discord notification tests...\n');
