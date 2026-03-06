"use server";

import { requireRole } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { invalidateUserSessions } from "~/lib/auth/session/session-manager";
import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export async function revokeUserSession(
  sessionId: string,
  targetUserId: number,
): Promise<ActionSuccess> {
  const safeSessionId = assertNonEmptyString(sessionId, "sessionId");
  const safeTargetUserId = assertPositiveInt(targetUserId, "targetUserId");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);

  await repos.sessions.delete(safeSessionId);
  await repos.extensionRuntime.revokeInstallationSessionsByAuthSession(
    safeSessionId,
    Date.now(),
  );

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "session_revoked_by_admin",
    entity_type: "user_session",
    entity_id: safeTargetUserId,
    changes: serializeAuditChanges(
      sessionRevokedByAdminChanges(safeSessionId, session.userId),
    ),
    created_at: Date.now(),
  });

  return { success: true };
}

export async function revokeAllUserSessions(
  targetUserId: number,
): Promise<ActionSuccess> {
  const safeTargetUserId = assertPositiveInt(targetUserId, "targetUserId");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);

  await invalidateUserSessions(safeTargetUserId);

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "all_sessions_revoked",
    entity_type: "user",
    entity_id: safeTargetUserId,
    changes: serializeAuditChanges(allSessionsRevokedChanges(session.userId)),
    created_at: Date.now(),
  });

  return { success: true };
}
