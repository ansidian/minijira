import db from '../db/connection.js';

const ARCHIVE_AFTER_DAYS = 7;
const BATCH_SIZE = 100;

/**
 * Archive issues that have been 'done' for ARCHIVE_AFTER_DAYS without updates.
 * Uses batched updates to prevent long table locks.
 * Subtasks are archived when their parent is archived.
 * @returns {Promise<number>} Total number of issues archived
 */
export async function archiveDoneIssues() {
  try {
    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    let totalArchived = 0;
    let rowsAffected = 0;

    // Archive parent issues first (status=done, no parent, 7+ days old)
    do {
      const result = await db.execute({
        sql: `UPDATE issues
              SET archived_at = CURRENT_TIMESTAMP
              WHERE status = 'done'
                AND parent_id IS NULL
                AND archived_at IS NULL
                AND updated_at < ?
                AND id IN (
                  SELECT id FROM issues
                  WHERE status = 'done'
                    AND parent_id IS NULL
                    AND archived_at IS NULL
                    AND updated_at < ?
                  LIMIT ?
                )`,
        args: [cutoffISO, cutoffISO, BATCH_SIZE]
      });

      rowsAffected = result.rowsAffected || 0;
      totalArchived += rowsAffected;

      // Continue while we're updating full batches (indicates more to archive)
    } while (rowsAffected === BATCH_SIZE);

    // Archive subtasks whose parent is archived
    const subtaskResult = await db.execute(`
      UPDATE issues
      SET archived_at = CURRENT_TIMESTAMP
      WHERE parent_id IS NOT NULL
        AND archived_at IS NULL
        AND parent_id IN (SELECT id FROM issues WHERE archived_at IS NOT NULL)
    `);
    totalArchived += subtaskResult.rowsAffected || 0;

    // Only log if we actually archived something
    if (totalArchived > 0) {
      console.log(`[Archive] Archived ${totalArchived} done issues older than ${ARCHIVE_AFTER_DAYS} days`);
    }

    return totalArchived;
  } catch (err) {
    console.error('[Archive] Failed to archive done issues:', err);
    throw err;
  }
}
