import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { getArtifact } from "~/server/files/service";
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

export async function GET(event: Pick<APIEvent, "params">): Promise<Response> {
  try {
    const safeId = assertPositiveInt(
      Number(event.params.artifactId),
      "artifactId",
    );
    const session = await requirePermission("file:artifact:read");
    const ctx = createAppContext(session);
    const { repo, storage, syncExecutor } = serverRuntime.files;

    const result = await getArtifact(ctx, safeId, {
      repo,
      storage,
      syncExecutor,
    });
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
