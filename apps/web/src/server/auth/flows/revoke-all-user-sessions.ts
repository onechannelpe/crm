import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

export async function revokeAllUserSessions(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { targetUserId: UserId },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.operationAt;
  await port.revokeUserSessions(input.targetUserId);
  await port.revokeInstallationSessionsByUser(input.targetUserId, now);
  await port.updateExecutiveSyncHealth({
    userId: input.targetUserId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  await port.appendEvent({
    type: "all_sessions_revoked",
    entityType: "user",
    entityId: auditEntityId("user", input.targetUserId),
    actorUserId: ctx.actor.userId,
    payload: { revokedBy: ctx.actor.userId },
    occurredAt: now,
  });
  return Ok({ success: true });
}
