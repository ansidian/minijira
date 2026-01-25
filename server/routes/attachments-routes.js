import express from "express";
import multer from "multer";
import db from "../db/connection.js";

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`));
    }
  },
});

// POST /api/attachments - Upload an image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { buffer, mimetype, originalname, size } = req.file;
    const base64Data = buffer.toString("base64");

    const result = await db.execute({
      sql: `INSERT INTO attachments (data, mime_type, filename, size) VALUES (?, ?, ?, ?)`,
      args: [base64Data, mimetype, originalname, size],
    });

    const id = Number(result.lastInsertRowid);
    res.status(201).json({
      id,
      url: `/api/attachments/${id}`,
    });
  } catch (err) {
    console.error("[Attachments] Upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// GET /api/attachments/:id - Retrieve an image
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: "SELECT data, mime_type FROM attachments WHERE id = ?",
      args: [req.params.id],
    });

    if (rows.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const { data, mime_type } = rows[0];
    const buffer = Buffer.from(data, "base64");

    res.set("Content-Type", mime_type);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  } catch (err) {
    console.error("[Attachments] Fetch error:", err);
    res.status(500).json({ error: "Failed to retrieve image" });
  }
});

// Multer error handler middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
