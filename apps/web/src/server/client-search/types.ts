import type { Selectable } from "kysely";

import type { SearchEnrichmentJobsTable } from "~/lib/db/types";
import type { Result } from "~/server/shared/result";

import type { SunatScraperClient } from "./enrichment/sunat/contracts";

export type EnrichmentDocumentType = "dni" | "ruc";

export interface SearchEnrichmentOverlay {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  fullName: string | null;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  source: "sunat";
  fetchedAt: number;
  expiresAt: number;
  payloadJson: string;
}

export interface SearchEnrichmentStatus {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  status: "idle" | "queued" | "running" | "completed" | "failed";
  overlay: SearchEnrichmentOverlay | null;
  lastError: string | null;
  requestedAt: number | null;
  completedAt: number | null;
}

export type SearchEnrichmentRequestError =
  | { reason: "invalid_document"; message: string }
  | { reason: "unexpected"; message: string };

export interface SearchEnrichmentProcessResult {
  completedAt: number;
}

export type SearchEnrichmentJobLeaseRow = Selectable<SearchEnrichmentJobsTable>;

export type SearchEnrichmentOverlayRow = {
  document_type: EnrichmentDocumentType;
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributor_status: string | null;
  contributor_condition: string | null;
  source: "sunat";
  fetched_at: number;
  expires_at: number;
  payload_json: string;
};

export type SearchEnrichmentJobStatusRow = {
  id: number;
  status: SearchEnrichmentStatus["status"];
  requested_at: number;
  completed_at: number | null;
  last_error: string | null;
};

export interface SearchEnrichmentRepoPort {
  findJobByDocument(
    documentType: EnrichmentDocumentType,
    documentValue: string,
  ): Promise<SearchEnrichmentJobStatusRow | null | undefined>;
  enqueueJob(values: {
    document_type: EnrichmentDocumentType;
    document_value: string;
    requested_by_user_id: number;
    now: number;
    max_attempts: number;
  }): Promise<number>;
  leaseJobs(
    limit: number,
    leaseMs: number,
    leaseOwner: string,
  ): Promise<SearchEnrichmentJobLeaseRow[]>;
  markJobCompleted(
    id: number,
    leaseOwner: string,
    now: number,
  ): Promise<unknown>;
  extendLease(id: number, workerId: string, leaseMs: number): Promise<boolean>;
  scheduleRetry(id: number, availableAt: number): Promise<unknown>;
  markJobFailed(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    now: number,
  ): Promise<unknown>;
  getOverlay(
    documentType: EnrichmentDocumentType,
    documentValue: string,
    now: number,
  ): Promise<SearchEnrichmentOverlayRow | null | undefined>;
  upsertOverlay(values: SearchEnrichmentOverlayRow): Promise<unknown>;
}

// Minimal interface for the job processing worker.
// request() and status() are additional methods on the concrete service
// used by UI actions and the pipeline enrichment queue.
export interface SearchEnrichmentService {
  searchEnrichmentRepo: SearchEnrichmentRepoPort;
  processJob(
    job: SearchEnrichmentJobLeaseRow,
    signal?: AbortSignal,
  ): Promise<SearchEnrichmentProcessResult>;
}

export interface SearchEnrichmentServiceDeps {
  now?: () => number;
  scraper?: SunatScraperClient;
}

export type SearchEnrichmentServiceWithActions = SearchEnrichmentService & {
  request(
    documentType: EnrichmentDocumentType,
    documentValue: string,
    requestedByUserId: number,
  ): Promise<Result<SearchEnrichmentStatus, SearchEnrichmentRequestError>>;
  status(
    documentType: EnrichmentDocumentType,
    documentValue: string,
  ): Promise<Result<SearchEnrichmentStatus, SearchEnrichmentRequestError>>;
};
