import type { Permission } from "~/domain/auth/access/rbac";
import type { AuthSession } from "~/domain/auth/access/session-types";
import type { DomainError } from "~/domain/errors";
import { toWire } from "~/server/platform/action/domain-error";
import {
  authenticate,
  authorizePermission,
} from "~/server/platform/action/session";
import { HTTP_STATUS_BY_WIRE_KIND } from "~/server/platform/http/wire-status";
import { Err, isErr, Ok, type Result } from "~/shared/result";

function authFailureResponse(error: DomainError): Response {
  const wire = toWire(error);
  return Response.json(
    { error: wire.message },
    { status: HTTP_STATUS_BY_WIRE_KIND[wire.kind] },
  );
}

export async function authorizeRoutePermission(
  permission: Permission,
): Promise<Result<AuthSession, Response>> {
  const identity = await authenticate();
  if (isErr(identity)) {
    return Err(authFailureResponse(identity.error));
  }

  const authorized = authorizePermission(identity.value, permission);
  if (isErr(authorized)) {
    return Err(authFailureResponse(authorized.error));
  }

  return Ok(identity.value);
}
