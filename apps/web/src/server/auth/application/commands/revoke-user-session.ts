import {
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import type { AdminSessionRevocationPort } from "../ports";

export async function revokeUserSession(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { sessionId: string; targetUserId: UserId },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.invalidateSession(input.sessionId);
  await port.revokeInstallationSessionsByAuthSession(input.sessionId, now);
  await port.updateExecutiveSyncHealth({
    userId: input.targetUserId,
    syncHealth: "reauth_required",
    syncUpdatedAt: now,
  });
  await port.createAuditLog({
    userId: ctx.actor.userId,
    action: "session_revoked_by_admin",
    entityType: "user_session",
    entityId: String(input.targetUserId),
    changes: serializeAuditChanges(
      sessionRevokedByAdminChanges(input.sessionId, ctx.actor.userId),
    ),
    createdAt: now,
  });
  return Ok({ success: true });
}
