import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { SessionRevocationDeps } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

export async function revokeAllUserSessions(
  ctx: AppContext,
  deps: SessionRevocationDeps,
  input: { targetUserId: UserId },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.operationAt;
  return deps.uow.run(async (tx) => {
    await tx.sessions.deleteAllForUser(input.targetUserId);
    await tx.extensionRuntime.revokeInstallationSessionsByUser(
      input.targetUserId,
      now,
    );
    await tx.extensionRuntime.updateExecutiveSyncHealthByUser({
      user_id: input.targetUserId,
      sync_health: "reauth_required",
      sync_updated_at: now,
    });
    await tx.events.append({
      type: "all_sessions_revoked",
      entityType: "user",
      entityId: auditEntityId("user", input.targetUserId),
      actorUserId: ctx.actor.userId,
      payload: { revokedBy: ctx.actor.userId },
      occurredAt: now,
    });
    return Ok({ success: true });
  });
}
