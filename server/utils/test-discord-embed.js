#!/usr/bin/env node
/**
 * Comprehensive Discord Embed Tester
 *
 * Tests all embed scenarios from discord-notifications.test.js
 * Usage: node server/utils/test-discord-embed.js [test-number]
 *
 * Run without arguments to see all available tests, or specify a test number to run.
 * Requires DISCORD_WEBHOOK_URL in .env
 */

import { buildEmbed } from './discord-embed-builder.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.error("❌ DISCORD_WEBHOOK_URL not set in .env");
  process.exit(1);
}

// Helper to send embed
async function sendEmbed(payload, description) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📤 ${description}`);
  console.log('='.repeat(70));
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 204) {
    console.log("✅ Sent successfully!\n");
    return true;
  } else {
    console.log("❌ Failed!");
    console.log("Status:", res.status);
    console.log("Response:", await res.text(), "\n");
    return false;
  }
}

// Test suite
const tests = [
  {
    name: "Issue Created (basic)",
    build: () =>
      buildEmbed(
        {
          id: 1,
          key: "JPL-464",
          title: "Implement user authentication",
          status: "todo",
        },
        [
          {
            type: "created",
            isSubtask: false,
            title: "Implement user authentication",
          },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Issue Created with Single Assignee",
    build: () =>
      buildEmbed(
        {
          id: 2,
          key: "JPL-465",
          title: "Add dark mode support",
          status: "todo",
        },
        [
          { type: "created", isSubtask: false, title: "Add dark mode support" },
          { type: "assignee", old: null, new: "Alice" },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Issue Created with Multiple Assignees",
    build: () =>
      buildEmbed(
        {
          id: 3,
          key: "JPL-466",
          title: "Refactor notification system",
          status: "todo",
        },
        [
          {
            type: "created",
            isSubtask: false,
            title: "Refactor notification system",
          },
          { type: "assignee", old: null, new: "Alice, Bob, Charlie" },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Subtask Created (under parent)",
    build: () =>
      buildEmbed(
        {
          id: 4,
          key: "JPL-467",
          title: "Parent issue for subtasks",
          status: "in_progress",
        },
        [
          {
            type: "created",
            isSubtask: true,
            subtaskKey: "JPL-468",
            title: "Write unit tests for auth module",
          },
        ],
        { name: "Bob" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Subtask Deleted (under parent)",
    build: () =>
      buildEmbed(
        { id: 5, key: "JPL-469", title: "Parent issue", status: "in_progress" },
        [{ type: "deleted", isSubtask: true, subtaskKey: "JPL-470", title: "Obsolete subtask" }],
        { name: "Charlie" },
        new Date().toISOString(),
        { deleted: true },
      ),
  },

  {
    name: "Status Change (Todo → In Progress)",
    build: () =>
      buildEmbed(
        {
          id: 6,
          key: "JPL-469",
          title: "Optimize database queries",
          status: "in_progress",
        },
        [{ type: "status", old: "todo", new: "in_progress" }],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Status Change (In Progress → Done)",
    build: () =>
      buildEmbed(
        {
          id: 7,
          key: "JPL-470",
          title: "Fix authentication bug",
          status: "done",
        },
        [{ type: "status", old: "in_progress", new: "done" }],
        { name: "Alice" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Priority Change (Low → High)",
    build: () =>
      buildEmbed(
        {
          id: 8,
          key: "JPL-471",
          title: "Security vulnerability patch",
          status: "todo",
        },
        [{ type: "priority", old: "low", new: "high" }],
        { name: "Bob" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Assignee Change (Single → Single)",
    build: () =>
      buildEmbed(
        {
          id: 9,
          key: "JPL-472",
          title: "Update documentation",
          status: "in_progress",
        },
        [{ type: "assignee", old: "Alice", new: "Bob" }],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Assignee Change (Single → Multiple)",
    build: () =>
      buildEmbed(
        {
          id: 10,
          key: "JPL-473",
          title: "Code review for PR #42",
          status: "in_progress",
        },
        [{ type: "assignee", old: "Alice", new: "Alice, Bob, Charlie" }],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Assignee Cleared (Unassigned)",
    build: () =>
      buildEmbed(
        { id: 11, key: "JPL-474", title: "Backlog item", status: "todo" },
        [{ type: "assignee", old: "Bob", new: null }],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Comment Added",
    build: () =>
      buildEmbed(
        {
          id: 12,
          key: "JPL-475",
          title: "Discuss architecture changes",
          status: "in_progress",
        },
        [
          {
            type: "comment",
            value:
              "We should consider using a queue-based approach here for better scalability. What do you think?",
          },
        ],
        { name: "Alice" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Multiple Field Changes (Status + Priority + Assignee)",
    build: () =>
      buildEmbed(
        {
          id: 13,
          key: "JPL-476",
          title: "Critical production bug",
          status: "in_progress",
        },
        [
          { type: "assignee", old: null, new: "Alice, Bob" },
          { type: "status", old: "todo", new: "in_progress" },
          { type: "priority", old: "low", new: "high" },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Subtask Status Change (grouped under parent)",
    build: () =>
      buildEmbed(
        {
          id: 14,
          key: "JPL-477",
          title: "Parent: Implement feature X",
          status: "in_progress",
        },
        [
          {
            type: "status",
            old: "todo",
            new: "done",
            isSubtask: true,
            subtaskKey: "JPL-478",
          },
        ],
        { name: "Charlie" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Subtask Multiple Field Changes (grouped under parent)",
    build: () =>
      buildEmbed(
        {
          id: 15,
          key: "JPL-479",
          title: "Parent: Complex feature",
          status: "in_progress",
        },
        [
          {
            type: "status",
            old: "todo",
            new: "in_progress",
            isSubtask: true,
            subtaskKey: "JPL-480",
          },
          {
            type: "priority",
            old: "low",
            new: "high",
            isSubtask: true,
            subtaskKey: "JPL-480",
          },
        ],
        { name: "Bob" },
        new Date().toISOString(),
      ),
  },

  {
    name: "Merged: Parent Status + Subtask Created",
    build: () =>
      buildEmbed(
        {
          id: 16,
          key: "JPL-481",
          title: "Build notification system",
          status: "in_progress",
        },
        [
          { type: "status", old: "todo", new: "in_progress" },
          {
            type: "created",
            isSubtask: true,
            subtaskKey: "JPL-482",
            title: "Design Discord embed format",
          },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
      ),
  },

  {
    name: "With Subtask Summary",
    build: () =>
      buildEmbed(
        {
          id: 17,
          key: "JPL-482",
          title: "Feature with multiple subtasks",
          status: "in_progress",
        },
        [{ type: "status", old: "todo", new: "in_progress" }],
        { name: "Alice" },
        new Date().toISOString(),
        { subtaskSummary: "✅ 2/5 subtasks done" },
      ),
  },

  {
    name: "Issue Deleted",
    build: () =>
      buildEmbed(
        {
          id: 18,
          key: "JPL-483",
          title: "Duplicate issue (deleted)",
          status: "deleted",
        },
        [
          {
            type: "deleted",
            isSubtask: false,
            title: "Duplicate issue (deleted)",
          },
        ],
        { name: "Andy Su" },
        new Date().toISOString(),
        { deleted: true },
      ),
  },

  {
    name: "Standalone Subtask (parent not in batch)",
    build: () =>
      buildEmbed(
        {
          id: 19,
          key: "JPL-484",
          title: "Add unit tests for login flow",
          status: "in_progress",
        },
        [
          { type: "status", old: "todo", new: "in_progress" },
          { type: "assignee", old: null, new: "Alice" },
        ],
        { name: "Bob" },
        new Date().toISOString(),
        { isSubtask: true },
      ),
  },

  {
    name: "Parent + Multiple Subtasks Combined",
    build: () =>
      buildEmbed(
        {
          id: 20,
          key: "JPL-485",
          title: "User Authentication System",
          status: "done",
        },
        [
          { type: "status", old: "in_progress", new: "done" },
          {
            type: "status",
            old: "in_progress",
            new: "done",
            isSubtask: true,
            subtaskKey: "JPL-486",
          },
          {
            type: "status",
            old: "todo",
            new: "done",
            isSubtask: true,
            subtaskKey: "JPL-487",
          },
          {
            type: "assignee",
            old: "Alice",
            new: "Bob",
            isSubtask: true,
            subtaskKey: "JPL-487",
          },
        ],
        { name: "Alice" },
        new Date().toISOString(),
        { subtaskSummary: "5/5 subtasks done" },
      ),
  },
];

// Main execution
const arg = process.argv[2];

// Check for "all" first, before parsing as integer
if (arg === "all") {
  console.log(
    "\n🚀 Running all tests (batched into multi-embed messages)...\n",
  );
  const MAX_EMBEDS_PER_MESSAGE = 10;
  let passed = 0;
  let failed = 0;

  // Batch tests into groups of up to 10 embeds
  for (
    let batchStart = 0;
    batchStart < tests.length;
    batchStart += MAX_EMBEDS_PER_MESSAGE
  ) {
    const batchEnd = Math.min(
      batchStart + MAX_EMBEDS_PER_MESSAGE,
      tests.length,
    );
    const batch = tests.slice(batchStart, batchEnd);

    // Build multi-embed payload
    const embeds = batch
      .map((test) => {
        const payload = test.build();
        // Extract the first embed from the payload
        return payload.embeds?.[0] || null;
      })
      .filter((embed) => embed !== null);

    const multiEmbedPayload = { embeds };

    const batchNum = Math.floor(batchStart / MAX_EMBEDS_PER_MESSAGE) + 1;
    const totalBatches = Math.ceil(tests.length / MAX_EMBEDS_PER_MESSAGE);
    const testRange = `${batchStart + 1}-${batchEnd}`;

    const success = await sendEmbed(
      multiEmbedPayload,
      `Batch ${batchNum}/${totalBatches}: Tests ${testRange} (${batch.length} embeds)`,
    );

    if (success) {
      passed += batch.length;
    } else {
      failed += batch.length;
    }

    // Wait 1 second between batches to avoid rate limiting
    if (batchEnd < tests.length) {
      console.log("⏳ Waiting 1 second before next batch...\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(
    `📊 Results: ${passed} passed, ${failed} failed (${Math.ceil(tests.length / MAX_EMBEDS_PER_MESSAGE)} batches sent)`,
  );
  console.log("=".repeat(70) + "\n");
} else if (arg) {
  // Try to parse as test number
  const testIndex = parseInt(arg);

  if (isNaN(testIndex)) {
    console.error(`❌ Invalid argument: "${arg}"`);
    console.log(`   Valid options: 1-${tests.length} or "all"\n`);
    process.exit(1);
  }

  const test = tests[testIndex - 1];
  if (!test) {
    console.error(
      `❌ Invalid test number: ${testIndex} (valid range: 1-${tests.length})`,
    );
    process.exit(1);
  }

  const payload = test.build();
  await sendEmbed(payload, test.name);
} else {
  // No argument - show help
  console.log("\n📋 Available Tests:\n");
  tests.forEach((test, i) => {
    console.log(`  ${i + 1}. ${test.name}`);
  });
  console.log(
    `\n💡 Usage: node server/utils/test-discord-embed.js <test-number>`,
  );
  console.log(`   Example: node server/utils/test-discord-embed.js 1`);
  console.log(`   Or run all: node server/utils/test-discord-embed.js all\n`);
}
