"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { repos } from "~/server/shared/context";

type SalesExportFormat = "csv" | "xlsx";

interface SalesExportJob {
  id: number;
  requestedByUserId: number;
  requestedByName: string;
  format: SalesExportFormat;
  status: "queued" | "running" | "completed" | "failed" | "expired";
  rowsCount: number | null;
  requestedAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  filters: Record<string, unknown> | null;
}

interface SalesExportDownload {
  id: number;
  exportJobId: number;
  downloadedByUserId: number;
  downloadedByName: string;
  downloadedAt: number;
}

const EXPORT_FORMATS: ReadonlyArray<SalesExportFormat> = ["csv", "xlsx"];

function isSalesExportFormat(value: string): value is SalesExportFormat {
  return EXPORT_FORMATS.some((format) => format === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFiltersJson(filtersJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(filtersJson) as unknown;
    if (!isRecord(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function mapJob(
  row: Awaited<ReturnType<typeof repos.reportExportJobs.listJobs>>[number],
): SalesExportJob {
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

function mapDownload(
  row: Awaited<
    ReturnType<typeof repos.reportExportJobs.listDownloadsByJob>
  >[number],
): SalesExportDownload {
  return {
    id: row.id,
    exportJobId: row.export_job_id,
    downloadedByUserId: row.downloaded_by_user_id,
    downloadedByName: row.downloaded_by_name,
    downloadedAt: row.downloaded_at,
  };
}

export async function listSalesExportJobs(
  limit = 20,
): Promise<SalesExportJob[]> {
  const safeLimit = Math.min(assertPositiveInt(limit, "limit"), 100);
  const session = await requirePermission("sales:review");
  const rows =
    session.role === "superuser"
      ? await repos.reportExportJobs.listJobs(safeLimit)
      : await repos.reportExportJobs.listJobsByBranch(
          safeLimit,
          session.branchId,
        );
  return rows.map(mapJob);
}

export async function getSalesExportJob(
  jobId: number,
): Promise<SalesExportJob | null> {
  const safeJobId = assertPositiveInt(jobId, "jobId");
  const session = await requirePermission("sales:review");
  const job = await repos.reportExportJobs.findJobById(safeJobId);
  if (!job) return null;
  if (session.role !== "superuser" && job.branch_id !== session.branchId) {
    return null;
  }

  const user = await repos.users.findById(job.requested_by_user_id);
  return {
    id: job.id,
    requestedByUserId: job.requested_by_user_id,
    requestedByName: user?.full_name ?? "Unknown",
    format: job.format,
    status: job.status,
    rowsCount: job.rows_count,
    requestedAt: job.requested_at,
    completedAt: job.completed_at,
    expiresAt: job.expires_at,
    filters: parseFiltersJson(job.filters_json),
  };
}

export async function listSalesExportDownloads(
  jobId: number,
): Promise<SalesExportDownload[]> {
  const safeJobId = assertPositiveInt(jobId, "jobId");
  const session = await requirePermission("sales:review");
  const job = await repos.reportExportJobs.findJobById(safeJobId);
  if (!job) return [];
  if (session.role !== "superuser" && job.branch_id !== session.branchId) {
    return [];
  }
  const rows = await repos.reportExportJobs.listDownloadsByJob(safeJobId);
  return rows.map(mapDownload);
}

export async function requestSalesExport(
  format: string,
): Promise<SalesExportJob> {
  if (!isSalesExportFormat(format)) {
    throw validationError("format is invalid");
  }
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales.export.request",
    actor,
    input: { format },
    run: async () => {
      const session = await requirePermission("sales:review");
      actor.userId = session.userId;
      actor.role = session.role;

      const now = Date.now();
      const branchScoped = session.role !== "superuser";
      const filters = {
        status: "confirmed",
        scope: branchScoped ? "branch" : "global",
        branchId: branchScoped ? session.branchId : null,
      };
      const jobId = await repos.reportExportJobs.createJob({
        requested_by_user_id: session.userId,
        branch_id: session.branchId,
        format,
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

      const newest = await repos.reportExportJobs.findJobById(jobId);
      if (!newest) throw notFoundError("Export job not found after creation");
      const user = await repos.users.findById(newest.requested_by_user_id);
      return {
        id: newest.id,
        requestedByUserId: newest.requested_by_user_id,
        requestedByName: user?.full_name ?? "Unknown",
        format: newest.format,
        status: newest.status,
        rowsCount: newest.rows_count,
        requestedAt: newest.requested_at,
        completedAt: newest.completed_at,
        expiresAt: newest.expires_at,
        filters: parseFiltersJson(newest.filters_json),
      };
    },
  });
}
