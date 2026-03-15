import type { APIEvent } from "@solidjs/start/server";

import { requirePermission } from "~/lib/auth/access/session";
import { isCreateExtensionHandoffTokenRequest } from "~/server/extension/contracts";
import { extensionService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { readJsonBody } from "./json-body";

export async function POST(event: APIEvent): Promise<Response> {
  try {
    const session = await requirePermission("lead:work");
    const parsed = await readJsonBody(event.request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body;
    if (!isCreateExtensionHandoffTokenRequest(body)) {
      return Response.json(
        { error: "Invalid handoff token request" },
        { status: 400 },
      );
    }

    const origin = event.request.headers.get("origin") ?? "";
    const result = await extensionService.createHandoffToken({
      userId: session.userId,
      authSessionId: session.sessionId,
      branchId: session.branchId,
      assignmentId: body.assignmentId,
      origin,
    });

    if (isErr(result)) {
      const status =
        result.error.reason === "assignment_not_found"
          ? 404
          : result.error.reason === "assignment_inactive"
            ? 409
            : result.error.reason === "invalid_origin"
              ? 403
              : result.error.reason === "misconfigured"
                ? 503
                : 500;
      return Response.json({ error: result.error.message }, { status });
    }

    return Response.json(result.value, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response("Unexpected error", { status: 500 });
  }
}
