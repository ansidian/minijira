#!/usr/bin/env node
/**
 * Manual test script for Discord embeds
 *
 * Usage: node server/utils/test-discord-embed.js
 *
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
  console.error('DISCORD_WEBHOOK_URL not set in .env');
  process.exit(1);
}

// Test: Subtask created with assignment 
const issue = { id: 25, key: 'JPL-25', title: 'Change structure of the code to make it more reusable and can run on any computer', status: 'todo' };
const changes = [
  {
    type: "created",
    isSubtask: true,
    title:
      "Refactor Lunar-Pipeline-Full [branch](https://github.com/JPL-Project/JPL-Project/tree/Garen/Lunar...)",
  },
  { type: "assignee", old: null, new: "Andy Su" },
];
const user = { name: 'Andy Su' };
const timestamp = new Date().toISOString();

const payload = buildEmbed(issue, changes, user, timestamp, {
  subtaskSummary: "0/1 subtasks done",
});

console.log('Sending embed:', JSON.stringify(payload, null, 2));

const res = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

console.log('Status:', res.status);
if (res.status === 204) {
  console.log('✓ Sent successfully!');
} else {
  console.log('Response:', await res.text());
}

// Test: Multi-issue batch (simulating moving multiple issues to Done)
console.log('\n--- Multi-embed test (batch of 4 issues) ---\n');

const multiEmbedPayload = {
  embeds: [
    buildEmbed(
      { id: 1, key: 'MJ-1', title: 'Set up project repository', status: 'done' },
      [{ type: 'status', old: 'in_progress', new: 'done' }],
      { name: 'Andy Su' },
      new Date().toISOString()
    ).embeds[0],
    buildEmbed(
      { id: 2, key: 'MJ-2', title: 'Design system architecture', status: 'done' },
      [{ type: 'status', old: 'review', new: 'done' }],
      { name: 'Andy Su' },
      new Date().toISOString()
    ).embeds[0],
    buildEmbed(
      { id: 3, key: 'MJ-3', title: 'Implement user authentication', status: 'done' },
      [{ type: 'status', old: 'todo', new: 'done' }],
      { name: 'Andy Su' },
      new Date().toISOString()
    ).embeds[0],
    buildEmbed(
      { id: 4, key: 'MJ-4', title: 'Write project documentation', status: 'done' },
      [{ type: 'status', old: 'in_progress', new: 'done' }, { type: 'assignee', old: null, new: 'Garen Artsrounian' }],
      { name: 'Andy Su' },
      new Date().toISOString()
    ).embeds[0],
  ]
};

console.log('Sending multi-embed:', JSON.stringify(multiEmbedPayload, null, 2));

const res2 = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(multiEmbedPayload)
});

console.log('Status:', res2.status);
if (res2.status === 204) {
  console.log('✓ Multi-embed sent successfully!');
} else {
  console.log('Response:', await res2.text());
}
