import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import { z } from "zod";
import {
  createIngestJob,
  deleteDocumentById,
  getDocumentById,
  getIngestJobById,
  getIngestJobByIdempotencyKey,
  getRunningIngestJobByNormalizedUrl,
  listDocuments,
  listIngestJobs,
  updateDocumentById,
} from "./db.js";
import { bootstrapIngestWorker, enqueueIngestJob } from "./jobs.js";
import type { IngestJob, IngestJobStatus } from "./types.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ingestSchema = z.object({
  url: z.string().url(),
});

const ingestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["queued", "running", "succeeded", "failed"]).optional(),
});

const documentsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const patchDocumentSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().min(1).max(1000).optional(),
    links: z
      .array(
        z.object({
          url: z.string().url(),
          content: z.string().min(1).max(500),
        }),
      )
      .max(100)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

function errorResponse(
  code: string,
  message: string,
  retryable: boolean,
  extra?: Record<string, unknown>,
) {
  return {
    error: {
      code,
      message,
      retryable,
    },
    ...(extra ?? {}),
  };
}

function normalizeInputUrl(rawUrl: string): string {
  const noBackslashes = rawUrl.trim().replace(/\\+/g, "").replace(/%5C/gi, "");
  return new URL(noBackslashes).toString();
}

function mapJobResponse(job: IngestJob) {
  return {
    id: job.id,
    request_id: job.request_id,
    raw_url: job.raw_url,
    normalized_url: job.normalized_url,
    status: job.status,
    attempt: job.attempt,
    max_attempts: job.max_attempts,
    error_code: job.error_code,
    error_message: job.error_message,
    document_id: job.document_id,
    created_at: job.created_at,
    updated_at: job.updated_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/ingest", (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("INVALID_REQUEST_BODY", "Invalid request body", false, { issues: parsed.error.issues }));
  }

  try {
    const normalizedUrl = normalizeInputUrl(parsed.data.url);
    const idempotencyKeyHeader = req.header("Idempotency-Key");
    const idempotencyKey = idempotencyKeyHeader ? idempotencyKeyHeader.trim() : "";

    if (idempotencyKey) {
      const existing = getIngestJobByIdempotencyKey(idempotencyKey, normalizedUrl);
      if (existing) {
        return res.status(202).json({
          job: mapJobResponse(existing),
          links: {
            self: `/ingest-jobs/${existing.id}`,
            document: existing.document_id ? `/documents/${existing.document_id}` : null,
          },
        });
      }
    }

    const existingRunning = getRunningIngestJobByNormalizedUrl(normalizedUrl);
    if (existingRunning) {
      return res.status(202).json({
        job: mapJobResponse(existingRunning),
        links: {
          self: `/ingest-jobs/${existingRunning.id}`,
          document: existingRunning.document_id ? `/documents/${existingRunning.document_id}` : null,
        },
      });
    }

    const job = createIngestJob({
      request_id: randomUUID(),
      idempotency_key: idempotencyKey || null,
      raw_url: parsed.data.url,
      normalized_url: normalizedUrl,
      max_attempts: 2,
    });

    enqueueIngestJob(job.id);

    return res.status(202).json({
      job: mapJobResponse(job),
      links: {
        self: `/ingest-jobs/${job.id}`,
        document: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isInvalidUrl = message.toLowerCase().includes("invalid url");
    return res
      .status(isInvalidUrl ? 400 : 500)
      .json(errorResponse(isInvalidUrl ? "INVALID_URL" : "INTERNAL_ERROR", message, false));
  }
});

app.get("/ingest-jobs/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json(errorResponse("INVALID_REQUEST_BODY", "Invalid id", false));
  }

  const job = getIngestJobById(id);
  if (!job) {
    return res.status(404).json(errorResponse("JOB_NOT_FOUND", "Job not found", false));
  }

  return res.json({
    job: mapJobResponse(job),
    links: {
      document: job.document_id ? `/documents/${job.document_id}` : null,
    },
  });
});

app.get("/ingest-jobs", (req, res) => {
  const parsed = ingestListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("INVALID_REQUEST_BODY", "Invalid query", false, { issues: parsed.error.issues }));
  }

  const limit = parsed.data.limit ?? 20;
  const status = parsed.data.status as IngestJobStatus | undefined;
  const items = listIngestJobs(limit, status).map((job) => ({
    id: job.id,
    status: job.status,
    normalized_url: job.normalized_url,
    document_id: job.document_id,
    updated_at: job.updated_at,
  }));
  return res.json({ items });
});

app.get("/documents", (req, res) => {
  const parsed = documentsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("INVALID_REQUEST_BODY", "Invalid query", false, { issues: parsed.error.issues }));
  }

  const limit = parsed.data.limit ?? 20;
  const offset = parsed.data.offset ?? 0;
  const rows = listDocuments(limit, offset);
  res.json({ items: rows });
});

app.get("/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json(errorResponse("INVALID_REQUEST_BODY", "Invalid id", false));
  }

  const row = getDocumentById(id);
  if (!row) {
    return res.status(404).json(errorResponse("DOCUMENT_NOT_FOUND", "Document not found", false));
  }

  return res.json({ document: row });
});

app.patch("/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json(errorResponse("INVALID_REQUEST_BODY", "Invalid id", false));
  }

  const parsed = patchDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("INVALID_REQUEST_BODY", "Invalid request body", false, { issues: parsed.error.issues }));
  }

  const updated = updateDocumentById(id, parsed.data);
  if (!updated) {
    return res.status(404).json(errorResponse("DOCUMENT_NOT_FOUND", "Document not found", false));
  }

  return res.json({ document: updated });
});

app.delete("/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json(errorResponse("INVALID_REQUEST_BODY", "Invalid id", false));
  }

  const deleted = deleteDocumentById(id);
  if (!deleted) {
    return res.status(404).json(errorResponse("DOCUMENT_NOT_FOUND", "Document not found", false));
  }

  return res.status(204).send();
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  const boot = bootstrapIngestWorker();
  if (boot.recoveredRunning || boot.queued) {
    console.log(
      `ingest worker bootstrapped: recoveredRunning=${boot.recoveredRunning}, queued=${boot.queued}`,
    );
  }
  console.log(`snap-url API listening on port ${port}`);
});
