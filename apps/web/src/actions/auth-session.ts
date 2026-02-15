"use server";

import { deleteSessionCookie, getSessionCookie } from "~/lib/auth/cookies";
import {
  invalidateSession,
  validateSessionToken,
} from "~/lib/auth/session-manager";
import type { Role } from "~/lib/auth/rbac";
import { hashSessionToken } from "~/lib/auth/tokens";
import { repos } from "~/server/shared/context";

export async function logout(): Promise<void> {
  const token = getSessionCookie();
  if (!token) return;

  const sessionId = hashSessionToken(token);
  const { session } = await validateSessionToken(token);

  await invalidateSession(sessionId);
  deleteSessionCookie();

  if (session) {
    await repos.auditLogs.create({
      user_id: session.userId,
      action: "logout",
      entity_type: "user",
      entity_id: session.userId,
      changes: null,
      created_at: Date.now(),
    });
  }
}

export interface CurrentUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  branchId: number;
}

export async function getMe(): Promise<CurrentUser | null> {
  const token = getSessionCookie();
  if (!token) return null;

  const { session } = await validateSessionToken(token);
  if (!session) return null;

  const user = await repos.users.findById(session.userId);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: session.role,
    branchId: user.branch_id,
  };
}
