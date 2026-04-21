import type { Role } from "~/lib/auth/access/rbac";
import type { FileStorage } from "~/server/files/storage";
import type { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface SalesExportDownloadSession {
  userId: number;
  role: Role;
  branchId: number;
}

interface DownloadSalesExportDeps {
  repos: {
    reportExportJobs: ReturnType<typeof createReportExportRepo>;
  };
  blobStore: Pick<FileStorage, "getBytes">;
  now?: () => number;
}

export async function downloadSalesExportById(
  jobId: number,
  session: SalesExportDownloadSession,
  deps: DownloadSalesExportDeps,
): Promise<
  Result<
    {
      filename: string;
      mimeType: string;
      body: ArrayBuffer;
    },
    DomainError
  >
> {
  const job = await deps.repos.reportExportJobs.findJobById(jobId);
  if (!job) {
    return Err(
      domainError("not_found", "export_job_not_found", "Export job not found"),
    );
  }
  if (session.role !== "superuser" && job.branch_id !== session.branchId) {
    return Err(
      domainError("not_found", "export_job_not_found", "Export job not found"),
    );
  }
  if (job.status !== "completed" || !job.file_storage_key) {
    return Err(
      domainError(
        "conflict",
        "export_file_not_ready",
        "Export file is not ready",
      ),
    );
  }

  let fileBytes: Uint8Array;
  try {
    fileBytes = await deps.blobStore.getBytes(job.file_storage_key);
  } catch {
    return Err(
      domainError(
        "not_found",
        "export_file_not_found",
        "Export file not found",
      ),
    );
  }

  await deps.repos.reportExportJobs.createDownload({
    export_job_id: jobId,
    downloaded_by_user_id: session.userId,
    downloaded_at: deps.now?.() ?? Date.now(),
    ip_hash: null,
    user_agent_hash: null,
  });

  const extension = job.format === "xlsx" ? "xlsx" : "csv";
  const mimeType =
    job.format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv; charset=utf-8";

  const body = new ArrayBuffer(fileBytes.byteLength);
  new Uint8Array(body).set(fileBytes);

  return Ok({
    filename: `sales-export-${job.id}.${extension}`,
    mimeType,
    body,
  });
}
