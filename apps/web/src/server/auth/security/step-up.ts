import type { AuthSession } from "~/domain/auth/access/session-types";
import { fail, type DomainError } from "~/domain/errors";
import { AUTH_STRONG_AUTH_MAX_AGE_MS } from "~/server/auth/config";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { Err, Ok, type Result } from "~/shared/result";

const DEFAULT_MAX_AGE_MS = AUTH_STRONG_AUTH_MAX_AGE_MS;

export function checkRecentStrongAuth(
  session: AuthSession,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): Result<void, DomainError> {
  if (!requiresStrongAuthRole(session.role)) {
    return Ok(undefined);
  }

  if (!session.strongAuthAt) {
    return Err(fail("strong_auth_required"));
  }

  if (Date.now() - session.strongAuthAt.getTime() > maxAgeMs) {
    return Err(fail("strong_auth_expired"));
  }

  return Ok(undefined);
}
