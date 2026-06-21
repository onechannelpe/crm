import type { AuthSession } from "~/lib/auth/access/session-types";
import { config } from "~/lib/config";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

const DEFAULT_MAX_AGE_MS = config.auth.strongAuthMaxAgeMs;

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

  if (Date.now() - session.strongAuthAt > maxAgeMs) {
    return Err(fail("strong_auth_expired"));
  }

  return Ok(undefined);
}
