import type { Json } from "~/contracts/json";
import type { WorkflowIntegrationJobsTable } from "~/lib/db/types";
import type { JobStore } from "~/lib/job-queue/job-store";
import type { QueueState } from "~/lib/job-queue/queue-state";
import type { QueueJobBase } from "~/lib/job-queue/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { IntegrationJobId, UserId } from "~/server/shared/ids";

export type IntegrationJobType = WorkflowIntegrationJobsTable["type"];

export interface IntegrationJobRow extends QueueJobBase {
  id: IntegrationJobId;
  type: IntegrationJobType;
  queue_state: QueueState;
  created_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: Json | null;
  claimable_at: Date;
  lease_owner: string | null;
  file_path: string | null;
  requested_by_user_id: UserId;
}

export interface NewIntegrationJob {
  type: IntegrationJobType;
  requested_by_user_id: UserId;
  file_path: string | null;
  rows_total: number;
  max_attempts: number;
  created_at: Date;
}

export interface IntegrationJobsPort {
  store: JobStore<IntegrationJobId, IntegrationJobRow>;
  insert(values: NewIntegrationJob): Promise<IntegrationJobRow>;
  findById(id: IntegrationJobId): Promise<IntegrationJobRow | undefined>;
  list(limit: number, offset: number): Promise<IntegrationJobRow[]>;
  updateProgress(
    id: IntegrationJobId,
    progress: {
      rowsTotal: number;
      rowsApplied: number;
      rowsFailed: number;
    },
  ): Promise<IntegrationJobRow>;
  setFilePath(id: IntegrationJobId, filePath: string): Promise<void>;
}

export interface IntegrationRuntime {
  executor: DatabaseExecutor;
  now: () => Date;
  jobs: IntegrationJobsPort;
  leads: {
    findByRucMany(
      rucs: string[],
    ): Promise<Array<{ id: string; ruc: string; executiveId: string }>>;
  };
  users: {
    findById(id: UserId): Promise<{ branch_id: string } | undefined>;
  };
}

export interface ImportJobProcessResult {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
  resultsJson: string;
}
