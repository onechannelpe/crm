import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { createAppContext } from "~/server/shared/action-runtime";
import {
  repos,
  observabilityService,
  salesExportBlobStore,
} from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

interface SalesExportDownloadSession {
  userId: number;
  role: import("~/lib/auth/access/rbac").Role;
  branchId: number;
}

interface DownloadSalesExportDeps {
  repos: Pick<Repositories, "reportExportJobs">;
  blobStore: {
    get(storageKey: string): Promise<Uint8Array>;
  };
  now?: () => number;
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  if (
    message === "Export job not found" ||
    message === "Export file not found"
  ) {
    return 404;
  }
  if (message === "Export file is not ready") return 409;
  if (message === "jobId is invalid") return 400;
  return 500;
}

function mapErrorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

export async function downloadSalesExportById(
  jobId: number,
  session: SalesExportDownloadSession,
  deps: DownloadSalesExportDeps,
): Promise<Response> {
  const job = await deps.repos.reportExportJobs.findJobById(jobId);
  if (!job) throw new Error("Export job not found");
  if (session.role !== "superuser" && job.branch_id !== session.branchId) {
    throw new Error("Export job not found");
  }
  if (job.status !== "completed" || !job.file_storage_key) {
    throw new Error("Export file is not ready");
  }

  let fileBytes: Uint8Array;
  try {
    fileBytes = await deps.blobStore.get(job.file_storage_key);
  } catch {
    throw new Error("Export file not found");
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

  const bodyBuffer = new ArrayBuffer(fileBytes.byteLength);
  new Uint8Array(bodyBuffer).set(fileBytes);
  return new Response(bodyBuffer, {
    status: 200,
    headers: {
      "content-type": mimeType,
      "content-disposition": `attachment; filename="sales-export-${job.id}.${extension}"`,
      "cache-control": "no-store",
    },
  });
}

export async function GET(event: Pick<APIEvent, "params">): Promise<Response> {
  try {
    const safeJobId = assertPositiveInt(Number(event.params.jobId), "jobId");
    const session = await requirePermission("sales:review");
    const ctx = createAppContext(session);
    const startedAt = ctx.now();

    const response = await downloadSalesExportById(safeJobId, session, {
      repos,
      blobStore: salesExportBlobStore,
    });

    void observabilityService
      .recordAction({
        traceId: ctx.traceId,
        requestId: ctx.requestId,
        routePath: "/api/sales/reports/exports/[jobId]/download",
        httpMethod: "GET",
        actionName: "sales.export.download",
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        status: "ok",
        durationMs: ctx.now() - startedAt,
        errorCode: null,
        errorMessage: null,
        input: { jobId: safeJobId },
        createdAt: ctx.now(),
      })
      .catch(() => {});

    return response;
  } catch (error: unknown) {
    return new Response(mapErrorToMessage(error), {
      status: mapErrorToStatus(error),
    });
  }
}
