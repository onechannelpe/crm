import type { Selectable } from "kysely";

import type { SearchEnrichmentJobsTable } from "~/lib/db/types";
import type { JobStore } from "~/lib/job-queue/job-store";
import type { DocumentKind } from "~/server/shared/document";

export type OverlayRow = {
  document_type: DocumentKind;
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributor_status: string | null;
  contributor_condition: string | null;
  economic_activities_json: unknown | null;
  source: "sunat";
  fetched_at: Date;
  expires_at: Date;
  payload_json: unknown;
};

export type JobRow = Selectable<SearchEnrichmentJobsTable>;

export type EnrichmentJobRequest = {
  document_type: DocumentKind;
  document_value: string;
  requested_by_user_id: string;
  now: Date;
  max_attempts: number;
};

export interface EnrichmentRepositoryPort {
  store: JobStore<string, JobRow>;
  upsertJob(values: EnrichmentJobRequest): Promise<string>;
  upsertJobs(values: EnrichmentJobRequest[]): Promise<void>;
  // Persists the SUNAT result (overlay upsert + writeback-outbox enqueue) in one
  // idempotent transaction, then wakes the writeback queue from inside that same
  // transaction. The job row's queue transition is settled separately by the
  // queue, so this no longer guards on the lease: re-running it after a reaped
  // lease just re-upserts the overlay and the outbox guard skips the duplicate.
  recordCompletion(overlay: OverlayRow, now: Date): Promise<void>;
  getOverlay(
    documentType: DocumentKind,
    documentValue: string,
  ): Promise<OverlayRow | null | undefined>;
  getJobStatus(
    documentType: DocumentKind,
    documentValue: string,
  ): Promise<JobRow | null | undefined>;
}
