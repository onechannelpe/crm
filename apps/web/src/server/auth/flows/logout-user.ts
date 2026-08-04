import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { AccessSecurityDeps } from "~/server/auth/application/ports";
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
  deps: AccessSecurityDeps,
): Promise<Result<void, DomainError>> {
  const { id, userId } = ctx.actor;
  const now = ctx.operationAt;

  return deps.uow.run(async (tx) => {
    await tx.sessions.delete(id);
    await tx.extensionRuntime.revokeInstallationSessionsByAuthSession(id, now);
    await tx.extensionRuntime.updateExecutiveSyncHealthByUser({
      user_id: userId,
      sync_health: "reauth_required",
      sync_updated_at: now,
    });
    await tx.events.append({
      type: "logout",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: userId,
      occurredAt: now,
    });
    return Ok(undefined);
  });
}
