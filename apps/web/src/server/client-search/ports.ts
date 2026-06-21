import type { Selectable } from "kysely";

import type { SearchEnrichmentJobsTable } from "~/lib/db/types";
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
  economic_activities_json: string | null;
  source: "sunat";
  fetched_at: number;
  expires_at: number;
  payload_json: string;
};

export type JobRow = Selectable<SearchEnrichmentJobsTable>;

export type EnrichmentJobRequest = {
  document_type: DocumentKind;
  document_value: string;
  requested_by_user_id: number;
  now: number;
  max_attempts: number;
};

export interface EnrichmentRepositoryPort {
  upsertJob(values: EnrichmentJobRequest): Promise<number>;
  upsertJobs(values: EnrichmentJobRequest[]): Promise<void>;
  leaseJobs(
    limit: number,
    leaseMs: number,
    leaseOwner: string,
  ): Promise<JobRow[]>;
  completeJob(
    id: number,
    leaseOwner: string,
    overlay: OverlayRow,
    now: number,
  ): Promise<void>;
  failJob(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    now: number,
  ): Promise<void>;
  retryJob(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    nextAttemptAt: number,
  ): Promise<void>;
  extendLease(id: number, workerId: string, leaseMs: number): Promise<boolean>;
  getOverlay(
    documentType: DocumentKind,
    documentValue: string,
  ): Promise<OverlayRow | null | undefined>;
  getJobStatus(
    documentType: DocumentKind,
    documentValue: string,
  ): Promise<JobRow | null | undefined>;
}
