import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
} from "~/contracts/audit";
import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import type { AppContext } from "~/server/shared/action-runtime/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

export async function revokeAllUserSessions(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.revokeUserSessions(input.targetUserId);
  await port.revokeInstallationSessionsByUser(input.targetUserId, now);
  await port.updateExecutiveSyncHealth({
    userId: input.targetUserId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  await port.createAuditLog({
    userId: ctx.actor.userId,
    action: "all_sessions_revoked",
    entityType: "user",
    entityId: input.targetUserId,
    changes: serializeAuditChanges(allSessionsRevokedChanges(ctx.actor.userId)),
    createdAt: now,
  });
  return Ok({ success: true });
}
