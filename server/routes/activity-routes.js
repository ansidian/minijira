import express from "express";
import db from "../db/connection.js";

const router = express.Router();

// Cursor pagination helpers
function encodeCursor(row) {
  if (!row) return null;
  return `${row.created_at}|${row.id}`;
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  const [created_at, id] = cursor.split('|');
  return { created_at, id: parseInt(id, 10) };
}

router.get("/", async (req, res) => {
  try {
    const { cursor, limit: limitParam } = req.query;

    // Pagination - only enabled when limit is explicitly provided
    const usePagination = limitParam !== undefined;
    const limit = usePagination ? Math.min(Math.max(parseInt(limitParam) || 20, 1), 100) : 50;
    const cursorData = usePagination ? decodeCursor(cursor) : null;

    let sql = `
      SELECT
        activity_log.*,
        users.name as user_name,
        users.avatar_color as user_color
      FROM activity_log
      LEFT JOIN users ON activity_log.user_id = users.id
      WHERE 1=1
    `;
    const args = [];

    // Cursor-based pagination (keyset pagination)
    if (cursorData) {
      sql += " AND (activity_log.created_at < ? OR (activity_log.created_at = ? AND activity_log.id < ?))";
      args.push(cursorData.created_at, cursorData.created_at, cursorData.id);
    }

    sql += " ORDER BY activity_log.created_at DESC, activity_log.id DESC";

    // Fetch limit + 1 to determine hasMore
    sql += ` LIMIT ?`;
    args.push(usePagination ? limit + 1 : limit);

    const { rows } = await db.execute({ sql, args });

    // Backwards compatibility: return array when no limit param
    if (!usePagination) {
      return res.json(rows);
    }

    // Paginated response
    const hasMore = rows.length > limit;
    const activities = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = activities[activities.length - 1];
    const nextCursor = hasMore ? encodeCursor(lastRow) : null;

    res.json({
      activities,
      nextCursor,
      hasMore
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
