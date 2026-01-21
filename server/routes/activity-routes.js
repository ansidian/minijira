import express from "express";
import db from "../db/connection.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await db.execute({
      sql: `
        SELECT
          activity_log.*,
          users.name as user_name,
          users.avatar_color as user_color
        FROM activity_log
        LEFT JOIN users ON activity_log.user_id = users.id
        ORDER BY activity_log.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
