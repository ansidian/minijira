/**
 * Queue Processor Module
 *
 * Background timer that checks notification_queue every 30 seconds
 * and processes ready notifications by sending them to Discord.
 */

import db from '../db/connection.js';
import { prepareNotificationPayload, sendDiscordNotification } from './discord-sender.js';

// Module-scoped state for timer lifecycle
let intervalId = null;
let isProcessing = false;

/**
 * Start the queue processor background timer
 * Checks queue every 30 seconds and sends ready notifications
 */
export async function startQueueProcessor() {
  if (intervalId !== null) {
    console.warn('[Queue Processor] Already running, ignoring start request');
    return;
  }

  // Reset orphaned 'processing' rows to 'pending' on startup
  try {
    const result = await db.execute({
      sql: `UPDATE notification_queue
            SET status = 'pending', processing_started_at = NULL
            WHERE status = 'processing'`,
      args: []
    });
    if (result.rowsAffected > 0) {
      console.log(`[STARTUP] Reset ${result.rowsAffected} orphaned 'processing' rows to 'pending'`);
    }
  } catch (err) {
    console.error('[STARTUP] Error resetting orphaned rows:', err);
    // Don't crash if DB unavailable, just log
  }

  console.log('[Queue Processor] Starting (30s interval)');

  intervalId = setInterval(async () => {
    try {
      await processReadyNotifications();
    } catch (err) {
      console.error('[Queue Processor] Error processing notifications:', err);
    }
  }, 30000); // 30 seconds

  // Don't block process exit
  intervalId.unref();
}

/**
 * Stop the queue processor background timer
 */
export function stopQueueProcessor() {
  if (intervalId === null) {
    console.warn('[Queue Processor] Not running, ignoring stop request');
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
  console.log('[Queue Processor] Stopped');
}

/**
 * Wait for in-flight notification processing to complete
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} - true if completed within timeout, false if timed out
 */
export async function awaitInFlight(timeoutMs = 30000) {
  // If not processing, resolve immediately
  if (!isProcessing) {
    return true;
  }

  // Poll every 100ms until processing completes or timeout
  const startTime = Date.now();
  while (isProcessing) {
    if (Date.now() - startTime >= timeoutMs) {
      return false; // Timeout
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return true; // Completed within timeout
}

/**
 * Process all ready notifications from the queue
 * Fetches pending notifications where scheduled_at <= now and sends to Discord
 */
async function processReadyNotifications() {
  // Skip if already processing (prevent overlapping cycles)
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // No-op if webhook not configured
    if (!webhookUrl) {
      return;
    }

    // Fetch ready notifications
    const result = await db.execute({
      sql: `SELECT * FROM notification_queue
            WHERE status = 'pending' AND scheduled_at <= datetime('now')
            ORDER BY scheduled_at ASC
            LIMIT 10`,
      args: []
    });

    const notifications = result.rows;

    if (notifications.length === 0) {
      return;
    }

    console.log(`[Queue Processor] Processing ${notifications.length} notifications`);

    // Process each notification individually
    for (const notification of notifications) {
      try {
        // Mark as processing
        await db.execute({
          sql: `UPDATE notification_queue
                SET status = 'processing', processing_started_at = datetime('now')
                WHERE id = ?`,
          args: [notification.id]
        });

        // Prepare payload (fetches issue, user, subtasks)
        const payload = await prepareNotificationPayload(notification, db);

        // Send to Discord
        const result = await sendDiscordNotification(webhookUrl, payload);

        if (result.success) {
          // Mark as sent
          await db.execute({
            sql: `UPDATE notification_queue
                  SET status = 'sent', sent_at = datetime('now')
                  WHERE id = ?`,
            args: [notification.id]
          });
        } else {
          // Mark as failed
          await db.execute({
            sql: `UPDATE notification_queue
                  SET status = 'failed',
                      error_message = ?,
                      attempt_count = attempt_count + 1
                  WHERE id = ?`,
            args: [result.error || 'Unknown error', notification.id]
          });
        }
      } catch (err) {
        // Individual failure shouldn't stop other notifications
        console.error(`[Queue Processor] Failed to process notification ${notification.id}:`, err);

        try {
          await db.execute({
            sql: `UPDATE notification_queue
                  SET status = 'failed',
                      error_message = ?,
                      attempt_count = attempt_count + 1
                  WHERE id = ?`,
            args: [err.message, notification.id]
          });
        } catch (updateErr) {
          console.error(`[Queue Processor] Failed to update error status for ${notification.id}:`, updateErr);
        }
      }
    }
  } finally {
    isProcessing = false;
  }
}
