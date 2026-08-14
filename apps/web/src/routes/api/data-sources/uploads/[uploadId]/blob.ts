import type { APIEvent } from "@solidjs/start/server";

import type { WireKind } from "~/contracts/errors";
import { hasPermission } from "~/domain/auth/access/rbac";
import type { DomainError } from "~/domain/errors";
import { getApplication } from "~/server/composition/application";
import { toWire } from "~/server/platform/action/domain-error";
import { getSession } from "~/server/platform/action/session";
import { isErr } from "~/shared/result";

// event.request.body is streamed straight into uploadIngestBlob and never
// read here: buffering it in this route would reintroduce the full-file
// memory problem the two-phase engine upload exists to avoid.
export async function PUT(event: APIEvent): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!hasPermission(session.role, "data-source:import")) {
      return new Response("Forbidden", { status: 403 });
    }

    const uploadId = event.params.uploadId;
    if (!uploadId) {
      return new Response("Not found", { status: 404 });
    }

    const contentLength = Number(event.request.headers.get("content-length"));
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return new Response("content-length header is required", {
        status: 400,
      });
    }

    if (!event.request.body) {
      return new Response("Request body is required", { status: 400 });
    }

    const result = await getApplication().dataSourceUploads.uploadBlob(
      uploadId,
      event.request.body,
      contentLength,
    );

    if (isErr(result)) {
      return domainErrorResponse(result.error);
    }

    return Response.json(result.value, { status: 200 });
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}

const STATUS_BY_WIRE_KIND: Record<WireKind, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal: 500,
};

function domainErrorResponse(error: DomainError): Response {
  const wire = toWire(error);
  return Response.json(
    { code: wire.code, message: wire.message },
    { status: STATUS_BY_WIRE_KIND[wire.kind] },
  );
}
