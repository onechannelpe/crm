import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { integrationJobBlobStore } from "~/server/integrations/infrastructure/runtime";
import { getObservabilityRuntime } from "~/server/observability/runtime";
import { createAppContext } from "~/server/shared/action-runtime";

const { observabilityService } = getObservabilityRuntime();

export async function GET(event: Pick<APIEvent, "params">): Promise<Response> {
  try {
    const safeJobId = assertPositiveInt(Number(event.params.jobId), "jobId");
    const session = await requirePermission("integration:manage");
    const ctx = createAppContext(session);
    const startedAt = ctx.now();

    const job = await getIntegrationJobQuery(safeJobId);
    if (!job) {
      return new Response("Export job not found", { status: 404 });
    }

    if (job.status !== "COMPLETED" || !job.file_path) {
      return new Response("Export is not ready for download", {
        status: 409,
      });
    }

    const bytes = await integrationJobBlobStore.get(job.file_path);

    void observabilityService
      .recordAction({
        traceId: ctx.traceId,
        requestId: ctx.requestId,
        routePath: "/api/integrations/exports/[jobId]/download",
        httpMethod: "GET",
        actionName: "integration.export.download",
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

    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/csv",
        "content-disposition": `attachment; filename="export-${safeJobId}.csv"`,
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
