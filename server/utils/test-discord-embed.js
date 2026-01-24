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

const issue = { id: 999, key: 'JPL-TEST', title: 'Discord notification test', status: 'in_progress' };
const changes = [
  { type: 'assignee', old: '', new: 'Andy Su' },
  { type: 'status', old: 'todo', new: 'in_progress' },
  { type: 'status', old: 'todo', new: 'done', isSubtask: true, subtaskKey: 'JPL-466' },
  { type: 'priority', old: 'low', new: 'high' },
  { type: 'created', isSubtask: true, title: 'testing subtasks' }
];
const user = { name: 'Andy Su' };
const timestamp = new Date().toISOString();

const payload = buildEmbed(issue, changes, user, timestamp, { subtaskSummary: '1/2 subtasks done' });

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
