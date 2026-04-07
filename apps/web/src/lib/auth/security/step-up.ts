import type { AuthSession } from "~/lib/auth/access/session-types";
import { config } from "~/lib/config";

import { requiresStrongAuthRole } from "./strong-auth-status";

const DEFAULT_MAX_AGE_MS = config.auth.strongAuthMaxAgeMs;

export function assertRecentStrongAuth(
  session: AuthSession,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): void {
  if (!requiresStrongAuthRole(session.role)) {
    return;
  }

  if (!session.strongAuthAt) {
    throw new Error("Strong authentication required");
  }

  if (Date.now() - session.strongAuthAt > maxAgeMs) {
    throw new Error("Strong authentication expired");
  }
}
