import type { AppContext } from "~/server/shared/action-runtime/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { AuthSessionLogoutPort } from "../ports";

export async function logoutUser(
  ctx: AppContext,
  port: AuthSessionLogoutPort,
): Promise<Result<void, DomainError>> {
  const { id, userId } = ctx.actor;
  const now = ctx.now();

  await port.invalidateSession(id);
  await port.revokeInstallationSessionsByAuthSession(id, now);
  await port.updateExecutiveSyncHealth({
    userId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  port.clearSessionCookie();
  await port.createAuditLog({
    userId,
    action: "logout",
    entityType: "user",
    entityId: userId,
    changes: null,
    createdAt: now,
  });

  return Ok(undefined);
}
