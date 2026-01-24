import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/notifications/pending
 * Returns pending notifications with issue details
 * Used for debugging and monitoring queue state
 */
router.get('/pending', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `
        SELECT
          nq.id,
          nq.issue_id,
          nq.user_id,
          nq.event_type,
          nq.event_payload,
          nq.scheduled_at,
          nq.first_queued_at,
          nq.status,
          nq.created_at,
          i.key as issue_key,
          i.title as issue_title,
          u.name as user_name
        FROM notification_queue nq
        LEFT JOIN issues i ON nq.issue_id = i.id
        LEFT JOIN users u ON nq.user_id = u.id
        WHERE nq.status = 'pending'
        ORDER BY nq.scheduled_at ASC
      `,
      args: []
    });

    // Parse event_payload JSON for each row
    const notifications = rows.map(row => ({
      ...row,
      event_payload: row.event_payload ? JSON.parse(row.event_payload) : null
    }));

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
