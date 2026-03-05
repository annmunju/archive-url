import {
  getIngestJobById,
  listQueuedJobIds,
  markIngestJobFailed,
  markIngestJobQueuedForRetry,
  markIngestJobRunning,
  markIngestJobSucceeded,
  resetRunningJobsToQueued,
} from "./db.js";
import { ingestUrl } from "./pipeline.js";

const queue: number[] = [];
const queuedSet = new Set<number>();
const INGEST_CONCURRENCY = Math.max(1, Number(process.env.INGEST_CONCURRENCY ?? 1));
let activeWorkers = 0;

type JobError = {
  code: string;
  retryable: boolean;
  message: string;
};

function toJobError(error: unknown): JobError {
  const message = error instanceof Error ? error.message : "Unknown error";
  const lower = message.toLowerCase();

  if (lower.includes("invalid url")) {
    return { code: "INVALID_URL", retryable: false, message };
  }
  if (lower.includes("failed") && lower.includes("normalize")) {
    return { code: "NORMALIZE_FAILED", retryable: false, message };
  }
  if (message.includes("Jina fetch failed") || lower.includes("fetch")) {
    return { code: "JINA_FETCH_FAILED", retryable: true, message };
  }
  if (lower.includes("abort")) {
    return { code: "JINA_FETCH_FAILED", retryable: true, message };
  }
  if (lower.includes("extract")) {
    return { code: "EXTRACT_FAILED", retryable: true, message };
  }
  if (lower.includes("summar")) {
    return { code: "SUMMARIZE_FAILED", retryable: true, message };
  }
  if (lower.includes("sqlite") || lower.includes("constraint")) {
    return { code: "PERSIST_FAILED", retryable: true, message };
  }
  return { code: "INTERNAL_ERROR", retryable: false, message };
}

async function runWorkerLoop() {
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    queuedSet.delete(id);
    await processJob(id);
  }
}

function kickWorkers() {
  while (activeWorkers < INGEST_CONCURRENCY && queue.length > 0) {
    activeWorkers += 1;
    void runWorkerLoop().finally(() => {
      activeWorkers -= 1;
      if (queue.length > 0) {
        kickWorkers();
      }
    });
  }
}

async function processJob(id: number) {
  const runningJob = markIngestJobRunning(id);
  if (!runningJob) return;

  try {
    const result = await ingestUrl(runningJob.raw_url);
    markIngestJobSucceeded(id, result.id);
  } catch (error) {
    const jobError = toJobError(error);
    const canRetry = jobError.retryable && runningJob.attempt < runningJob.max_attempts;

    if (canRetry) {
      markIngestJobQueuedForRetry(id, jobError.code, jobError.message);
      enqueueIngestJob(id);
      return;
    }

    markIngestJobFailed(id, jobError.code, jobError.message);
  }
}

export function enqueueIngestJob(jobId: number): void {
  if (queuedSet.has(jobId)) return;
  queuedSet.add(jobId);
  queue.push(jobId);
  kickWorkers();
}

export function bootstrapIngestWorker(): { recoveredRunning: number; queued: number } {
  const recoveredRunning = resetRunningJobsToQueued();
  const queuedIds = listQueuedJobIds();
  for (const id of queuedIds) {
    const row = getIngestJobById(id);
    if (!row) continue;
    if (row.attempt >= row.max_attempts) {
      markIngestJobFailed(id, "INTERNAL_ERROR", "Max attempts exceeded before restart");
      continue;
    }
    enqueueIngestJob(id);
  }
  return { recoveredRunning, queued: queuedIds.length };
}
