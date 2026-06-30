import { createJobStore, type JobStore } from "~/lib/job-queue/job-store";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

// The slice of an outbox row the writeback handler reads to apply the SUNAT
// result. Queue control columns the store owns are not surfaced here.
export interface SunatEnrichmentWritebackJob {
  id: string;
  document_type: "dni" | "ruc";
  document_value: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  fetched_at: Date;
  attempt_count: number;
  max_attempts: number;
}

// The completion outbox carries no user-facing status, so the only mirror
// columns are the finished-at stamp (`processed_at`) and the failure reason
// (`error_message`); the store owns them through the lifecycle map.
export function createSunatEnrichmentWritebackOutboxRepo(
  executor: DatabaseExecutor,
): JobStore<string, SunatEnrichmentWritebackJob> {
  return createJobStore<SunatEnrichmentWritebackJob, string>(
    executor,
    "search_enrichment_completion_outbox",
    [
      "id",
      "document_type",
      "document_value",
      "legal_name",
      "address",
      "district",
      "department",
      "fetched_at",
      "queue_state",
      "attempt_count",
      "max_attempts",
      "available_at",
      "lease_owner",
      "lease_until",
      "error_message",
      "created_at",
      "processed_at",
    ],
    { finishedAt: "processed_at", error: "error_message" },
  );
}

export type SunatEnrichmentWritebackOutboxRepo = JobStore<
  string,
  SunatEnrichmentWritebackJob
>;
