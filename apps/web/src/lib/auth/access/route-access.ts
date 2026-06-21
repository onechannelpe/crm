import type { WireKind } from "~/lib/wire-error";
import { toWire, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { Permission } from "./rbac";
import { authenticate, authorizePermission } from "./session";
import type { AuthSession } from "./session-types";

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
  if (isErr(identity)) return Err(authFailureResponse(identity.error));

  const authorized = authorizePermission(identity.value, permission);
  if (isErr(authorized)) return Err(authFailureResponse(authorized.error));

  return Ok(identity.value);
}
