import type { APIEvent } from "@solidjs/start/server";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { repos, salesExportBlobStore } from "~/server/shared/context";

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

export async function GET(event: APIEvent): Promise<Response> {
  try {
    const safeJobId = assertPositiveInt(Number(event.params.jobId), "jobId");
    const actor = { userId: null as number | null, role: null as Role | null };
    return await runObservedAction({
      actionName: "sales.export.download",
      actor,
      input: { jobId: safeJobId },
      run: async () => {
        const session = await requirePermission("sales:review");
        actor.userId = session.userId;
        actor.role = session.role;

        const job = await repos.reportExportJobs.findJobById(safeJobId);
        if (!job) throw new Error("Export job not found");
        if (
          session.role !== "superuser" &&
          job.branch_id !== session.branchId
        ) {
          throw new Error("Export job not found");
        }
        if (job.status !== "completed" || !job.file_storage_key) {
          throw new Error("Export file is not ready");
        }

        let fileBytes: Uint8Array;
        try {
          fileBytes = await salesExportBlobStore.get(job.file_storage_key);
        } catch {
          throw new Error("Export file not found");
        }

        await repos.reportExportJobs.createDownload({
          export_job_id: safeJobId,
          downloaded_by_user_id: session.userId,
          downloaded_at: Date.now(),
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
      },
    });
  } catch (error: unknown) {
    return new Response(mapErrorToMessage(error), {
      status: mapErrorToStatus(error),
    });
  }
}
