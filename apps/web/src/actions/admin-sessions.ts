"use server";

import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type { UserSession } from "~/lib/db/schema";

import { requireRole } from "~/lib/auth/access/session";
import { invalidateUserSessions } from "~/lib/auth/session/session-manager";
import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export async function listUserSessions(userId: number): Promise<UserSession[]> {
  const safeUserId = assertPositiveInt(userId, "userId");
  await requireRole("admin");
  return repos.sessions.listForUser(safeUserId);
}

export async function getActiveSessionsCount(): Promise<number> {
  await requireRole("admin");
  return repos.sessions.countActive();
}

export async function revokeUserSession(
  sessionId: string,
  targetUserId: number,
): Promise<ActionSuccess> {
  const safeSessionId = assertNonEmptyString(sessionId, "sessionId");
  const safeTargetUserId = assertPositiveInt(targetUserId, "targetUserId");
  const session = await requireRole("admin");

  await repos.sessions.delete(safeSessionId);

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

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  await requireRole("admin");

  const sessions = await repos.sessions.db
    .selectFrom("user_sessions")
    .innerJoin("users", "user_sessions.user_id", "users.id")
    .innerJoin("branches", "user_sessions.branch_id", "branches.id")
    .select([
      "user_sessions.id",
      "user_sessions.user_id",
      "users.email as userEmail",
      "users.full_name as userName",
      "user_sessions.role",
      "branches.name as branchName",
      "user_sessions.ip_address as ipAddress",
      "user_sessions.user_agent as userAgent",
      "user_sessions.created_at as createdAt",
      "user_sessions.last_activity as lastActivity",
      "user_sessions.expires_at as expiresAt",
    ])
    .where("user_sessions.expires_at", ">", Date.now())
    .orderBy("user_sessions.last_activity", "desc")
    .execute();

  return sessions.map((s) => ({
    id: s.id,
    userId: s.user_id,
    userEmail: s.userEmail,
    userName: s.userName,
    role: s.role,
    branchName: s.branchName,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity,
    expiresAt: s.expiresAt,
  }));
}
