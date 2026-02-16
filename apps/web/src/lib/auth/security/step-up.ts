import type { SessionData } from "~/lib/auth/access/session";
import { config } from "~/lib/config";

import { isPrivilegedRole } from "./policy";

const DEFAULT_MAX_AGE_MS = config.auth.strongAuthMaxAgeMs;

export function assertRecentStrongAuth(
  session: SessionData,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): void {
  if (!isPrivilegedRole(session.role)) {
    return;
  }

  if (!session.strongAuthAt) {
    throw new Error("Strong authentication required");
  }

  if (Date.now() - session.strongAuthAt > maxAgeMs) {
    throw new Error("Strong authentication expired");
  }
}
