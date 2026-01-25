import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import usersRouter from "./routes/users-routes.js";
import issuesRouter from "./routes/issues-routes.js";
import commentsRouter from "./routes/comments-routes.js";
import activityRouter from "./routes/activity-routes.js";
import statsRouter from "./routes/stats-routes.js";
import eventsRouter from "./routes/events-routes.js";
import notificationsRouter from './routes/notifications-routes.js';
import { startQueueProcessor, stopQueueProcessor, awaitInFlight } from "./utils/queue-processor.js";
import { closeDb } from "./db/connection.js";
import { cleanupActivityLog } from './jobs/cleanup.js';
import { archiveDoneIssues } from './jobs/archive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Shutdown state tracking
let isShuttingDown = false;
let cleanupIntervalId = null;

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../client/dist")));
}

app.use("/api/users", usersRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/issues", commentsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/stats", statsRouter);
app.use("/api/events", eventsRouter);
app.use('/api/notifications', notificationsRouter);

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../client/dist/index.html"));
  });
}

const server = app.listen(PORT, async () => {
  console.log(`✓ MiniJira API running at http://localhost:${PORT}`);
  await startQueueProcessor();

  // Run cleanup on startup
  cleanupActivityLog().catch(err => {
    console.error('[Startup] Activity log cleanup failed:', err);
    // Don't crash server on cleanup failure
  });

  // Run archive on startup
  archiveDoneIssues().catch(err => {
    console.error('[Startup] Archive job failed:', err);
  });

  // Schedule daily maintenance jobs (24 hours)
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  cleanupIntervalId = setInterval(() => {
    cleanupActivityLog().catch(err => {
      console.error('[Scheduled] Activity log cleanup failed:', err);
    });
    archiveDoneIssues().catch(err => {
      console.error('[Scheduled] Archive job failed:', err);
    });
  }, CLEANUP_INTERVAL_MS);
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  // Ignore duplicate signals
  if (isShuttingDown) {
    console.log(`[SHUTDOWN] Already shutting down, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;

  console.log(`[SHUTDOWN] Received ${signal}`);

  // Force exit timer (30 seconds)
  const forceExitTimer = setTimeout(() => {
    console.error('[SHUTDOWN] Force exit after 30s timeout');
    process.exit(1);
  }, 30000);
  forceExitTimer.unref();

  // 1. Stop queue timer (no new cycles)
  console.log('[SHUTDOWN] Stopping queue timer');
  stopQueueProcessor();

  // 2. Clear cleanup interval
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }

  // 3. Wait for in-flight sends to complete
  console.log('[SHUTDOWN] Waiting for in-flight sends');
  const completed = await awaitInFlight(25000); // Leave 5s for HTTP/DB close
  if (completed) {
    console.log('[SHUTDOWN] In-flight sends complete');
  } else {
    console.log('[SHUTDOWN] In-flight sends did not complete within timeout');
  }

  // 4. Stop HTTP server
  console.log('[SHUTDOWN] Closing HTTP server');
  await new Promise((resolve) => {
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
      resolve();
    });
  });

  // 5. Close database connection
  console.log('[SHUTDOWN] Closing database connection');
  await closeDb();
  console.log('[SHUTDOWN] Database connection closed');

  // 6. Clean exit
  console.log('[SHUTDOWN] Complete');
  process.exit(0);
}

// Register handlers for both signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
