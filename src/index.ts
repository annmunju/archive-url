import "dotenv/config";
import express from "express";
import { z } from "zod";
import { getDocumentById, listDocuments } from "./db.js";
import { ingestUrl } from "./pipeline.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ingestSchema = z.object({
  url: z.string().url(),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/ingest", async (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      issues: parsed.error.issues,
    });
  }

  try {
    const result = await ingestUrl(parsed.data.url);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/documents", (req, res) => {
  const limit = Number(req.query.limit ?? "20");
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  const rows = listDocuments(safeLimit);
  res.json(rows);
});

app.get("/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const row = getDocumentById(id);
  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(row);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`snap-url API listening on port ${port}`);
});
