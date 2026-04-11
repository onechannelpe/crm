import type { Selectable } from "kysely";

import type { SearchEnrichmentJobsTable } from "~/lib/db/types";

export type EnrichmentDocumentType = "dni" | "ruc";

// Explicit job state machine
export type EnrichmentJobStatus =
  | "idle" // never queued
  | "queued" // waiting to be leased
  | "running" // leased by worker
  | "completed" // has overlay
  | "failed_retryable" // will retry
  | "failed_terminal"; // won't retry

// Canonical overlay shape, single source of truth
export interface EnrichmentOverlay {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  fullName: string | null; // DNI only
  legalName: string | null; // RUC only
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

// Row-level shape for DB (snake_case)
export type EnrichmentOverlayRow = {
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

// Status DTO for queries
export interface EnrichmentStatus {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  status: EnrichmentJobStatus;
  overlay: EnrichmentOverlay | null;
  lastError: string | null;
  requestedAt: number | null;
}

// Job lease during processing
export type EnrichmentJobLease = Selectable<SearchEnrichmentJobsTable>;

// Discriminated error types from processors/clients
export type EnrichmentError =
  | { kind: "not_found" }
  | { kind: "server_error"; detail?: string }
  | { kind: "timeout" }
  | { kind: "malformed_response"; detail?: string }
  | { kind: "invalid_document"; message: string };

// Process result: either successful overlay or error with retry flag
export type EnrichmentProcessResult =
  | { ok: true; overlay: EnrichmentOverlay }
  | { ok: false; error: EnrichmentError; shouldRetry: boolean };

// Repository port
export interface EnrichmentRepositoryPort {
  // Atomic upsert: idempotent, always returns job ID
  upsertJob(values: {
    document_type: EnrichmentDocumentType;
    document_value: string;
    requested_by_user_id: number;
    now: number;
    max_attempts: number;
  }): Promise<number>;

  // Lease batch for processing
  leaseJobs(
    limit: number,
    leaseMs: number,
    leaseOwner: string,
  ): Promise<EnrichmentJobLease[]>;

  // Mark completion with overlay
  completeJob(
    id: number,
    leaseOwner: string,
    overlay: EnrichmentOverlayRow,
    now: number,
  ): Promise<void>;

  // Mark terminal failure (no retry)
  failJobTerminal(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    now: number,
  ): Promise<void>;

  // Mark retryable failure (will retry)
  failJobRetryable(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    nextAvailableAt: number,
  ): Promise<void>;

  // Extend active lease
  extendLease(id: number, workerId: string, leaseMs: number): Promise<boolean>;

  // Read overlay (for queries)
  getOverlay(
    documentType: EnrichmentDocumentType,
    documentValue: string,
    now: number,
  ): Promise<EnrichmentOverlayRow | null | undefined>;

  // Read job status (for queries)
  getJobStatus(
    documentType: EnrichmentDocumentType,
    documentValue: string,
  ): Promise<EnrichmentJobLease | null | undefined>;
}
