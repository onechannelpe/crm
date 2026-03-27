import type { Role } from "~/lib/auth/access/rbac";
import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";
import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import type { UserSession } from "~/lib/db/types";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { authRepos } from "./repos";

export interface SessionInfo {
  id: string;
  userId: number;
  userEmail: string;
  userName: string;
  role: Role;
  branchName: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export async function listUserSessions(
  _ctx: AppContext,
  input: { userId: number },
): Promise<Result<UserSession[], DomainError>> {
  return Ok(await authRepos.sessions.listForUser(input.userId));
}

export async function countActiveSessions(): Promise<
  Result<number, DomainError>
> {
  return Ok(await authRepos.sessions.countActive());
}

export async function listAllActiveSessions(): Promise<
  Result<SessionInfo[], DomainError>
> {
  return Ok(await authRepos.sessions.listAllActive());
}

export async function revokeUserSession(
  ctx: AppContext,
  input: { sessionId: string; targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await invalidateSession(input.sessionId);
  await authRepos.extensionRuntime.revokeInstallationSessionsByAuthSession(
    input.sessionId,
    now,
  );
  await authRepos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: input.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: now,
  });
  await authRepos.auditLogs.create({
    user_id: ctx.actor.userId,
    action: "session_revoked_by_admin",
    entity_type: "user_session",
    entity_id: input.targetUserId,
    changes: serializeAuditChanges(
      sessionRevokedByAdminChanges(input.sessionId, ctx.actor.userId),
    ),
    created_at: now,
  });
  return Ok({ success: true });
}

export async function revokeAllUserSessions(
  ctx: AppContext,
  input: { targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await invalidateUserSessions(input.targetUserId);
  await authRepos.extensionRuntime.revokeInstallationSessionsByUser(
    input.targetUserId,
    now,
  );
  await authRepos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: input.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: now,
  });
  await authRepos.auditLogs.create({
    user_id: ctx.actor.userId,
    action: "all_sessions_revoked",
    entity_type: "user",
    entity_id: input.targetUserId,
    changes: serializeAuditChanges(allSessionsRevokedChanges(ctx.actor.userId)),
    created_at: now,
  });
  return Ok({ success: true });
}
