import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/shared/action-runtime/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

export async function revokeUserSession(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { sessionId: string; targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.revokeSession(input.sessionId);
  await port.revokeInstallationSessionsByAuthSession(input.sessionId, now);
  await port.updateExecutiveSyncHealth({
    userId: input.targetUserId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  await port.appendEvent({
    type: "session_revoked_by_admin",
    entityType: "user_session",
    entityId: input.targetUserId,
    actorUserId: ctx.actor.userId,
    payload: { sessionId: input.sessionId, revokedBy: ctx.actor.userId },
    occurredAt: now,
  });
  return Ok({ success: true });
}
