import { auditEntityId } from "~/domain/audit/entity";
import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AccessSecurityDeps } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

export async function revokeUserSession(
  ctx: AppContext,
  deps: AccessSecurityDeps,
  input: { sessionId: string; targetUserId: UserId },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.operationAt;
  return deps.uow.run(async (tx) => {
    await tx.sessions.delete(input.sessionId);
    await tx.extensionRuntime.revokeInstallationSessionsByAuthSession(
      input.sessionId,
      now,
    );
    await tx.extensionRuntime.updateExecutiveSyncHealthByUser({
      user_id: input.targetUserId,
      sync_health: "reauth_required",
      sync_updated_at: now,
    });
    await tx.events.append({
      type: "session_revoked_by_admin",
      entityType: "user_session",
      entityId: auditEntityId("user_session", input.sessionId),
      actorUserId: ctx.actor.userId,
      payload: {
        targetUserId: input.targetUserId,
        revokedBy: ctx.actor.userId,
      },
      occurredAt: now,
    });
    return Ok({ success: true });
  });
}
