import express from "express";
import db from "../db/connection.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { include_subtasks } = req.query;

    const parentFilter =
      include_subtasks === "true" ? "" : "WHERE parent_id IS NULL";
    const parentFilterAnd =
      include_subtasks === "true" ? "WHERE" : "WHERE parent_id IS NULL AND";

    const [total, todo, inProgress, review, done] = await Promise.all([
      db.execute(`SELECT COUNT(*) as count FROM issues ${parentFilter}`),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'todo'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'in_progress'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'review'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM issues ${parentFilterAnd} status = 'done'`
      ),
    ]);

    res.json({
      total: total.rows[0].count,
      todo: todo.rows[0].count,
      in_progress: inProgress.rows[0].count,
      review: review.rows[0].count,
      done: done.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
