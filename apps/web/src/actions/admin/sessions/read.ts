"use server";

import { sql } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import { requireRole } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { UserSession } from "~/lib/db/types";
import { repos } from "~/server/shared/context";
import { asUserId } from "~/server/shared/ids";

export async function listUserSessions(userId: number): Promise<UserSession[]> {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return repos.sessions.listForUser(safeUserId);
}

export async function getActiveSessionsCount(): Promise<number> {
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return repos.sessions.countActive();
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
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);

  const sessions = await repos.sessions.db
    .selectFrom("user_sessions")
    .innerJoin("users", "user_sessions.user_id", "users.id")
    .innerJoin("branches", "user_sessions.branch_id", "branches.id")
    .select([
      "user_sessions.id",
      "user_sessions.user_id",
      "users.email as userEmail",
      sql<string>`users.names || ' ' || users.first_surname`.as("userName"),
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
