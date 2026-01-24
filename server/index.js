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
import { startQueueProcessor, stopQueueProcessor } from "./utils/queue-processor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

const server = app.listen(PORT, () => {
  console.log(`✓ MiniJira API running at http://localhost:${PORT}`);
  startQueueProcessor();
});

// Clean shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  stopQueueProcessor();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
