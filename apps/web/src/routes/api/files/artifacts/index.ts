import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { listArtifacts, requestArtifact } from "~/server/files/service";
import { isArtifactType, isExecutionMode } from "~/server/files/types";
import { serverRuntime } from "~/server/runtime";
import { createAppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

function mapErrorToStatus(kind: string): number {
  if (kind === "validation") return 400;
  if (kind === "forbidden") return 403;
  if (kind === "not_found") return 404;
  if (kind === "conflict") return 409;
  return 500;
}

export async function POST(
  event: Pick<APIEvent, "request">,
): Promise<Response> {
  try {
    const session = await requirePermission("file:artifact:request");
    const ctx = createAppContext(session);
    const { repo, storage, syncExecutor } = serverRuntime.files;

    // oxlint-disable-next-line no-unsafe-type-assertion
    const body = (await event.request.json()) as {
      artifactType?: string;
      executionMode?: string;
      workflowContext?: Record<string, unknown>;
    };

    if (!isArtifactType(body.artifactType)) {
      return new Response("Invalid or missing artifactType", { status: 400 });
    }
    if (!isExecutionMode(body.executionMode)) {
      return new Response("Invalid or missing executionMode", { status: 400 });
    }

    const result = await requestArtifact(
      ctx,
      {
        artifactType: body.artifactType,
        executionMode: body.executionMode,
        workflowContext: body.workflowContext ?? {},
      },
      { repo, storage, syncExecutor },
    );

    if (isErr(result)) {
      return new Response(result.error.message, {
        status: mapErrorToStatus(result.error.kind),
      });
    }

    return Response.json(result.value, { status: 201 });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unexpected error",
      { status: 500 },
    );
  }
}

export async function GET(event: Pick<APIEvent, "request">): Promise<Response> {
  try {
    const session = await requirePermission("file:artifact:audit:read");
    const ctx = createAppContext(session);
    const { repo, storage, syncExecutor } = serverRuntime.files;

    const url = new URL(event.request.url);
    const rawType = url.searchParams.get("artifactType") ?? undefined;
    const artifactType = isArtifactType(rawType) ? rawType : undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const result = await listArtifacts(
      ctx,
      {
        artifactType,
        limit: isNaN(limit) ? 50 : limit,
        offset: isNaN(offset) ? 0 : offset,
      },
      { repo, storage, syncExecutor },
    );

    if (isErr(result)) {
      return new Response(result.error.message, {
        status: mapErrorToStatus(result.error.kind),
      });
    }

    return Response.json(result.value);
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unexpected error",
      { status: 500 },
    );
  }
}
