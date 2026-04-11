import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
} from "~/lib/contracts/audit";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { AdminSessionRevocationPort } from "../ports";

export async function revokeAllUserSessions(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.invalidateUserSessions(input.targetUserId);
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
