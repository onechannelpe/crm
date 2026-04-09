import type { PipelineIntegrationJobsTable } from "~/lib/db/types";
import type { QueueJobBase } from "~/lib/job-queue/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type IntegrationJobType = PipelineIntegrationJobsTable["type"];
export type IntegrationJobStatus = PipelineIntegrationJobsTable["status"];

export interface IntegrationJobRow extends QueueJobBase {
  id: number;
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
  insert(values: NewIntegrationJob): Promise<number>;
  findById(id: number): Promise<IntegrationJobRow | undefined>;
  list(limit: number, offset: number): Promise<IntegrationJobRow[]>;
  claimPending(
    leaseMs: number,
    workerId: string,
    batchSize: number,
    types?: IntegrationJobType[],
  ): Promise<IntegrationJobRow[]>;
  markCompleted(id: number, result: IntegrationJobCompletion): Promise<unknown>;
  extendLease(id: number, workerId: string, leaseMs: number): Promise<boolean>;
  scheduleRetry(id: number, availableAt: number): Promise<unknown>;
  markFailed(id: number, errorMessage: string): Promise<unknown>;
  setFilePath(id: number, filePath: string): Promise<unknown>;
}

export interface IntegrationRuntime {
  executor: DatabaseExecutor;
  jobs: IntegrationJobsPort;
  leadExportQuery: {
    list(filters: { executiveId?: number }): Promise<
      Array<{
        id: number;
        ruc: string;
        razonSocial: string | null;
        address: string | null;
        stage: string;
        status: string | null;
        prioridad: string | null;
        createdAt: number;
        executiveId: number;
        executiveName: string | null;
      }>
    >;
  };
  leads: {
    findByRucMany(
      rucs: string[],
    ): Promise<Array<{ id: number; ruc: string; executiveId: number }>>;
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
