import { notFoundError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { isPlainRecord } from "~/lib/type-guards";
import { shortName } from "~/lib/users/display-name";
import type { SalesExportFormat } from "~/server/sales/types";
import type { AppContext } from "~/server/shared/action-runtime";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

export interface SalesExportJob {
  id: number;
  requestedByUserId: UserId;
  requestedByName: string;
  format: SalesExportFormat;
  status: "queued" | "running" | "completed" | "failed" | "expired";
  rowsCount: number | null;
  requestedAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  filters: Record<string, unknown> | null;
}

export interface SalesExportDownload {
  id: number;
  exportJobId: number;
  downloadedByUserId: UserId;
  downloadedByName: string;
  downloadedAt: number;
}

export interface SalesExportActor {
  userId: UserId;
  role: Role;
  branchId: BranchId;
}

export interface SalesExportServiceDeps {
  reportExportJobs: {
    listJobs(
      limit: number,
      scope?: { branchId: BranchId },
    ): Promise<ReportExportListRow[]>;
    findJobById(jobId: number): Promise<
      | {
          id: number;
          requested_by_user_id: UserId;
          format: SalesExportFormat;
          status: SalesExportJob["status"];
          rows_count: number | null;
          requested_at: number;
          completed_at: number | null;
          expires_at: number | null;
          filters_json: string;
          branch_id: BranchId;
        }
      | null
      | undefined
    >;
    listDownloadsByJob(jobId: number): Promise<ReportExportDownloadRow[]>;
    createJob(input: {
      requested_by_user_id: UserId;
      branch_id: BranchId;
      format: SalesExportFormat;
      filters_json: string;
      status: "queued";
      rows_count: null;
      file_storage_key: null;
      file_sha256: null;
      error_message: null;
      requested_at: number;
      completed_at: null;
      expires_at: null;
      lease_owner: null;
      lease_until: null;
      attempt_count: number;
      max_attempts: number;
    }): Promise<number>;
  };
  users: {
    findById(userId: UserId): Promise<
      | {
          id: UserId;
          names: string;
          first_surname: string;
          second_surname: string;
        }
      | null
      | undefined
    >;
  };
}

type ReportExportListRow = {
  id: number;
  requested_by_user_id: UserId;
  requested_by_name: string;
  format: SalesExportFormat;
  status: SalesExportJob["status"];
  rows_count: number | null;
  requested_at: number;
  completed_at: number | null;
  expires_at: number | null;
  filters_json: string;
};

type ReportExportDownloadRow = {
  id: number;
  export_job_id: number;
  downloaded_by_user_id: UserId;
  downloaded_by_name: string;
  downloaded_at: number;
};

function parseFiltersJson(filtersJson: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(filtersJson);
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mapJob(row: ReportExportListRow): SalesExportJob {
  return {
    id: row.id,
    requestedByUserId: row.requested_by_user_id,
    requestedByName: row.requested_by_name,
    format: row.format,
    status: row.status,
    rowsCount: row.rows_count,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    filters: parseFiltersJson(row.filters_json),
  };
}

function mapDownload(row: ReportExportDownloadRow): SalesExportDownload {
  return {
    id: row.id,
    exportJobId: row.export_job_id,
    downloadedByUserId: row.downloaded_by_user_id,
    downloadedByName: row.downloaded_by_name,
    downloadedAt: row.downloaded_at,
  };
}

function canReadJob(actor: SalesExportActor, branchId: BranchId): boolean {
  return actor.role === "superuser" || actor.branchId === branchId;
}

export async function listSalesExportJobsForActor(
  actor: SalesExportActor,
  limit: number,
  deps: SalesExportServiceDeps,
): Promise<SalesExportJob[]> {
  const rows = await deps.reportExportJobs.listJobs(
    limit,
    actor.role === "superuser" ? undefined : { branchId: actor.branchId },
  );
  return rows.map(mapJob);
}

export async function getSalesExportJobForActor(
  actor: SalesExportActor,
  jobId: number,
  deps: SalesExportServiceDeps,
): Promise<SalesExportJob | null> {
  const job = await deps.reportExportJobs.findJobById(jobId);
  if (!job || !canReadJob(actor, job.branch_id)) {
    return null;
  }

  const user = await deps.users.findById(job.requested_by_user_id);
  return {
    id: job.id,
    requestedByUserId: job.requested_by_user_id,
    requestedByName: user ? shortName(user) : "Unknown",
    format: job.format,
    status: job.status,
    rowsCount: job.rows_count,
    requestedAt: job.requested_at,
    completedAt: job.completed_at,
    expiresAt: job.expires_at,
    filters: parseFiltersJson(job.filters_json),
  };
}

export async function listSalesExportDownloadsForActor(
  actor: SalesExportActor,
  jobId: number,
  deps: SalesExportServiceDeps,
): Promise<SalesExportDownload[]> {
  const job = await deps.reportExportJobs.findJobById(jobId);
  if (!job || !canReadJob(actor, job.branch_id)) {
    return [];
  }
  const rows = await deps.reportExportJobs.listDownloadsByJob(jobId);
  return rows.map(mapDownload);
}

export async function requestSalesExportJob(
  ctx: AppContext,
  input: { format: SalesExportFormat },
  deps: SalesExportServiceDeps,
): Promise<SalesExportJob> {
  const now = ctx.now();
  const branchScoped = ctx.actor.role !== "superuser";
  const filters = {
    status: "confirmed",
    scope: branchScoped ? "branch" : "global",
    branchId: branchScoped ? ctx.actor.branchId : null,
  };

  const jobId = await deps.reportExportJobs.createJob({
    requested_by_user_id: ctx.actor.userId,
    branch_id: ctx.actor.branchId,
    format: input.format,
    filters_json: JSON.stringify(filters),
    status: "queued",
    rows_count: null,
    file_storage_key: null,
    file_sha256: null,
    error_message: null,
    requested_at: now,
    completed_at: null,
    expires_at: null,
    lease_owner: null,
    lease_until: null,
    attempt_count: 0,
    max_attempts: 5,
  });

  await publishJob(JOB_CHANNELS.SALES_EXPORT, jobId);

  const newest = await deps.reportExportJobs.findJobById(jobId);
  if (!newest) {
    throw notFoundError("Export job not found after creation");
  }

  const user = await deps.users.findById(newest.requested_by_user_id);
  return {
    id: newest.id,
    requestedByUserId: newest.requested_by_user_id,
    requestedByName: user ? shortName(user) : "Unknown",
    format: newest.format,
    status: newest.status,
    rowsCount: newest.rows_count,
    requestedAt: newest.requested_at,
    completedAt: newest.completed_at,
    expiresAt: newest.expires_at,
    filters: parseFiltersJson(newest.filters_json),
  };
}
