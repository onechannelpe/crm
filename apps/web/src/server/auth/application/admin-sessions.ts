import type { Role } from "~/lib/auth/access/rbac";
import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import type { UserSession } from "~/lib/db/types";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { AdminSessionsReadContext } from "../infrastructure/admin-sessions-read-context";
import type { AdminSessionRevocationPort } from "./ports";

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
  deps: AdminSessionsReadContext,
  input: { userId: number },
): Promise<Result<UserSession[], DomainError>> {
  return Ok(await deps.repos.sessions.listForUser(input.userId));
}

export async function countActiveSessions(
  deps: AdminSessionsReadContext,
): Promise<Result<number, DomainError>> {
  return Ok(await deps.repos.sessions.countActive());
}

export async function listAllActiveSessions(
  deps: AdminSessionsReadContext,
): Promise<Result<SessionInfo[], DomainError>> {
  return Ok(await deps.repos.sessions.listAllActive());
}

export async function revokeUserSession(
  ctx: AppContext,
  port: AdminSessionRevocationPort,
  input: { sessionId: string; targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.invalidateSession(input.sessionId);
  await port.revokeInstallationSessionsByAuthSession(input.sessionId, now);
  await port.updateExecutiveSyncHealthByUser({
    user_id: input.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: now,
  });
  await port.createAuditLog({
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
  port: AdminSessionRevocationPort,
  input: { targetUserId: number },
): Promise<Result<{ success: true }, DomainError>> {
  const now = ctx.now();
  await port.invalidateUserSessions(input.targetUserId);
  await port.revokeInstallationSessionsByUser(input.targetUserId, now);
  await port.updateExecutiveSyncHealthByUser({
    user_id: input.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: now,
  });
  await port.createAuditLog({
    user_id: ctx.actor.userId,
    action: "all_sessions_revoked",
    entity_type: "user",
    entity_id: input.targetUserId,
    changes: serializeAuditChanges(allSessionsRevokedChanges(ctx.actor.userId)),
    created_at: now,
  });
  return Ok({ success: true });
}
