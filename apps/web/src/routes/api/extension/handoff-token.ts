import { authorizeRoutePermission } from "~/lib/auth/access/route-access";
import { isCreateExtensionHandoffTokenRequest } from "~/server/extension/contracts";
import { getServerRuntime } from "~/server/platform/container";
import { toWire } from "~/server/shared/domain-error";
import { asContactAssignmentId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import type { ApiRequestEvent } from "../request-event";
import { readJsonBody } from "./json-body";

export async function POST(event: ApiRequestEvent): Promise<Response> {
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

  const auth = await authorizeRoutePermission("lead:work");
  if (isErr(auth)) return auth.error;
  const session = auth.value;

  const origin = event.request.headers.get("origin") ?? "";
  const result =
    await getServerRuntime().extension.extensionService.createHandoffToken({
      userId: session.userId,
      authSessionId: session.id,
      branchId: session.branchId,
      assignmentId: asContactAssignmentId(body.assignmentId),
      origin,
    });

  if (isErr(result)) {
    const status =
      result.error.code === "assignment_not_found"
        ? 404
        : result.error.code === "assignment_inactive"
          ? 409
          : result.error.code === "invalid_origin"
            ? 403
            : result.error.code === "misconfigured"
              ? 503
              : 500;
    return Response.json({ error: toWire(result.error).message }, { status });
  }

  return Response.json(result.value, { status: 200 });
}
