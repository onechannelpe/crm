import type { AuthSession } from "~/lib/auth/access/session-types";
import { config } from "~/lib/config";
import {
  actionErrorFrom,
  fail,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { requiresStrongAuthRole } from "./strong-auth-status";

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

export function assertRecentStrongAuth(
  session: AuthSession,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): void {
  const result = checkRecentStrongAuth(session, maxAgeMs);
  if (isErr(result)) throw actionErrorFrom(result.error);
}
