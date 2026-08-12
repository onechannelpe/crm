import type { WireKind } from "~/contracts/errors";
import type { Permission } from "~/domain/auth/access/rbac";
import type { AuthSession } from "~/domain/auth/access/session-types";
import type { DomainError } from "~/domain/errors";
import { toWire } from "~/server/platform/action/domain-error";
import {
  authenticate,
  authorizePermission,
} from "~/server/platform/action/session";
import { Err, isErr, Ok, type Result } from "~/shared/result";

const HTTP_STATUS_BY_WIRE_KIND: Record<WireKind, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal: 500,
};

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
