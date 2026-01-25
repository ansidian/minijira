import db from '../db/connection.js';

const RETENTION_DAYS = 30;
const BATCH_SIZE = 100;

/**
 * Delete activity log entries older than RETENTION_DAYS.
 * Uses batched deletes to prevent long table locks.
 * @returns {Promise<number>} Total number of entries deleted
 */
export async function cleanupActivityLog() {
  try {
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    let totalDeleted = 0;
    let rowsAffected = 0;

    // Delete in batches to avoid long table locks
    do {
      const result = await db.execute({
        sql: `DELETE FROM activity_log
              WHERE created_at < ?
              AND id IN (
                SELECT id FROM activity_log
                WHERE created_at < ?
                LIMIT ?
              )`,
        args: [cutoffISO, cutoffISO, BATCH_SIZE]
      });

      rowsAffected = result.rowsAffected || 0;
      totalDeleted += rowsAffected;

      // Continue while we're deleting full batches (indicates more to delete)
    } while (rowsAffected === BATCH_SIZE);

    // Only log if we actually deleted something
    if (totalDeleted > 0) {
      console.log(`[Cleanup] Deleted ${totalDeleted} activity log entries older than ${RETENTION_DAYS} days`);
    }

    return totalDeleted;
  } catch (err) {
    console.error('[Cleanup] Failed to cleanup activity log:', err);
    throw err;
  }
}
