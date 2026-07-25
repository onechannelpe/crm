import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

export async function revokeUserSession(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { sessionId: string; targetUserId: UserId },
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
    entityId: auditEntityId("user_session", input.sessionId),
    actorUserId: ctx.actor.userId,
    payload: { targetUserId: input.targetUserId, revokedBy: ctx.actor.userId },
    occurredAt: now,
  });
  return Ok({ success: true });
}
