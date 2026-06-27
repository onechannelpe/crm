import type { WorkflowIntegrationJobsTable } from "~/lib/db/types";
import type { QueueJobBase } from "~/lib/job-queue/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadQueries } from "~/server/workflow/lead/read/lead-queries";

export type IntegrationJobType = WorkflowIntegrationJobsTable["type"];
export type IntegrationJobStatus = WorkflowIntegrationJobsTable["status"];

export interface IntegrationJobRow extends QueueJobBase {
  id: string;
  type: IntegrationJobType;
  status: IntegrationJobStatus;
  created_at: number;
  completed_at: number | null;
  error_message: string | null;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: string | null;
  available_at: number | null;
  lease_owner: string | null;
  lease_until: number | null;
  file_path: string | null;
  requested_by_user_id: number;
}

export interface NewIntegrationJob {
  type: IntegrationJobType;
  status: IntegrationJobStatus;
  requested_by_user_id: number;
  file_path: string | null;
  max_attempts: number;
  created_at: number;
}

export interface IntegrationJobCompletion {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
  resultsJson: string | null;
}

export interface IntegrationJobsPort {
  insert(values: NewIntegrationJob): Promise<string>;
  findById(id: string): Promise<IntegrationJobRow | undefined>;
  list(limit: number, offset: number): Promise<IntegrationJobRow[]>;
  claimPending(
    leaseMs: number,
    workerId: string,
    batchSize: number,
    types?: IntegrationJobType[],
  ): Promise<IntegrationJobRow[]>;
  markCompleted(id: string, result: IntegrationJobCompletion): Promise<unknown>;
  updateProgress(
    id: string,
    progress: { rowsTotal?: number; rowsApplied?: number; rowsFailed?: number },
  ): Promise<unknown>;
  extendLease(id: string, workerId: string, leaseMs: number): Promise<boolean>;
  scheduleRetry(id: string, availableAt: number): Promise<unknown>;
  markFailed(id: string, errorMessage: string): Promise<unknown>;
  setFilePath(id: string, filePath: string): Promise<unknown>;
}

export interface IntegrationRuntime {
  executor: DatabaseExecutor;
  now: () => number;
  jobs: IntegrationJobsPort;
  recordExportQuery: LeadQueries;
  leads: {
    findByRucMany(
      rucs: string[],
    ): Promise<Array<{ id: string; ruc: string; executiveId: number }>>;
  };
  users: {
    findById(id: number): Promise<{ branch_id: number } | undefined>;
  };
}

export interface ExportJobProcessResult extends IntegrationJobCompletion {}

export interface ImportJobProcessResult extends IntegrationJobCompletion {
  resultsJson: string;
}

export interface ExportBatchRunner {
  processJob(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<ExportJobProcessResult>;
}

export interface ImportBatchRunner {
  processJob(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<ImportJobProcessResult>;
}
