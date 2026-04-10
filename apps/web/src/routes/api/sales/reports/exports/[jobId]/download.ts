import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { serverRuntime } from "~/server/runtime";
import { downloadSalesExportById } from "~/server/sales-exports/download";
import { createAppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

function mapErrorToStatus(error: DomainError): number {
  if (error.kind === "validation") return 400;
  if (error.kind === "forbidden") return 403;
  if (error.kind === "not_found") return 404;
  if (error.kind === "conflict") return 409;
  return 500;
}

export async function GET(event: Pick<APIEvent, "params">): Promise<Response> {
  try {
    const { observabilityService } = serverRuntime.observability;
    const { blobStore, exportDeps } = serverRuntime.sales;
    const safeJobId = assertPositiveInt(Number(event.params.jobId), "jobId");
    const session = await requirePermission("sales:review");
    const ctx = createAppContext(session);
    const startedAt = ctx.now();

    const response = await downloadSalesExportById(safeJobId, session, {
      repos: { reportExportJobs: exportDeps.reportExportJobs },
      blobStore,
    });
    if (isErr(response)) {
      return new Response(response.error.message, {
        status: mapErrorToStatus(response.error),
      });
    }

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

    return new Response(response.value.body, {
      status: 200,
      headers: {
        "content-type": response.value.mimeType,
        "content-disposition": `attachment; filename="${response.value.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error: unknown) {
    return new Response(
      error instanceof Error ? error.message : "Unexpected error",
      {
        status:
          error instanceof Error && error.message === "jobId is invalid"
            ? 400
            : 500,
      },
    );
  }
}
