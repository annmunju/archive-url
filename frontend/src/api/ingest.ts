import { apiFetch } from "./client";
import type { IngestJob } from "./types";

type CreateIngestResponse = {
  job: IngestJob;
  links: {
    self: string;
    document: string | null;
  };
};

type GetJobResponse = {
  job: IngestJob;
  links: {
    document: string | null;
  };
};

export async function createIngestJob(url: string): Promise<CreateIngestResponse> {
  return apiFetch<CreateIngestResponse>("/ingest", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getIngestJob(id: number): Promise<GetJobResponse> {
  return apiFetch<GetJobResponse>(`/ingest-jobs/${id}`);
}
