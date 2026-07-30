import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { AuthSessionLogoutPort } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

/**
 * Revokes the session and its downstream state. Clearing the caller's session
 * cookie is deliberately not done here: it is a transport effect that needs a
 * request, and this flow also runs from the background worker, which has none.
 * HTTP callers clear the cookie themselves after this resolves.
 */
export async function logoutUser(
  ctx: AppContext,
  port: AuthSessionLogoutPort,
): Promise<Result<void, DomainError>> {
  const { id, userId } = ctx.actor;
  const now = ctx.now();

  await port.revokeSession(id);
  await port.revokeInstallationSessionsByAuthSession(id, now);
  await port.updateExecutiveSyncHealth({
    userId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  await port.appendEvent({
    type: "logout",
    entityType: "user",
    entityId: auditEntityId("user", userId),
    actorUserId: userId,
    occurredAt: now,
  });

  return Ok(undefined);
}
