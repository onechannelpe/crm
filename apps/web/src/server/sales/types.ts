import type { QueueJobBase } from "~/lib/job-queue/types";

export type SalesExportFormat = "csv" | "xlsx";

export interface SalesExportProcessResult {
  rowsCount: number;
  fileStorageKey: string;
  fileSha256: string;
  completedAt: number;
  expiresAt: number;
}

export interface ReportExportLeasedJob extends QueueJobBase {
  branch_id: number;
  format: SalesExportFormat;
  filters_json: string;
}

export interface ReportExportJobsPort {
  leaseQueuedJobs(
    limit: number,
    leaseMs: number,
    leaseOwner: string,
  ): Promise<ReportExportLeasedJob[]>;
  extendLease(id: number, workerId: string, leaseMs: number): Promise<boolean>;
  scheduleRetry(id: number, availableAt: number): Promise<unknown>;
  markJobCompleted(
    id: number,
    leaseOwner: string,
    rowsCount: number,
    fileStorageKey: string,
    fileSha256: string,
    completedAt: number,
    expiresAt: number,
  ): Promise<unknown>;
  markJobFailed(
    id: number,
    leaseOwner: string,
    errorMessage: string,
    completedAt: number,
  ): Promise<unknown>;
  listJobsToExpire(
    limit: number,
    now: number,
  ): Promise<Array<{ id: number; file_storage_key: string | null }>>;
  markJobExpired(id: number): Promise<unknown>;
}

export interface SalesRecordsPort {
  listConfirmedWithClient(scope?: {
    branchId?: number;
    executiveUserId?: number;
  }): Promise<
    Array<{
      id: number;
      company_name: string | null;
      contact_name: string | null;
      dni: string | null;
      executive_name: string;
      confirmed_at: number | null;
    }>
  >;
}

export interface SalesExportService {
  reportExportJobsRepo: ReportExportJobsPort;
  processJob(
    job: ReportExportLeasedJob,
    signal?: AbortSignal,
  ): Promise<SalesExportProcessResult>;
  expireCompleted(limit: number): Promise<number>;
}
