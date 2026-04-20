import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { uploadArtifactFile } from "~/server/files/service";
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
  event: Pick<APIEvent, "params" | "request">,
): Promise<Response> {
  try {
    const safeId = assertPositiveInt(
      Number(event.params.artifactId),
      "artifactId",
    );
    const session = await requirePermission("file:artifact:upload");
    const ctx = createAppContext(session);
    const { repo, storage, syncExecutor } = serverRuntime.files;

    const formData = await event.request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response("file field is required", { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const result = await uploadArtifactFile(
      ctx,
      safeId,
      { name: file.name, bytes },
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
