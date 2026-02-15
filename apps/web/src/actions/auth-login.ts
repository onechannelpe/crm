"use server";

import { getSessionCookie, setSessionCookie } from "~/lib/auth/cookies";
import { verifyPassword } from "~/lib/auth/password";
import { createSession, invalidateSession } from "~/lib/auth/session-manager";
import type { Role } from "~/lib/auth/rbac";
import { hashSessionToken } from "~/lib/auth/tokens";
import { repos } from "~/server/shared/context";
import { assertNonEmptyString } from "~/lib/contracts/guards";

export interface LoginResult {
  userId: number;
  role: Role;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const safeEmail = assertNonEmptyString(email, "email");
  const safePassword = assertNonEmptyString(password, "password");
  const user = await repos.users.findByEmail(safeEmail);
  if (!user) throw new Error("Invalid credentials");
  if (!user.is_active) throw new Error("Account disabled");

  const valid = await verifyPassword(user.password_hash, safePassword);
  if (!valid) throw new Error("Invalid credentials");

  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    null,
    null,
  );
  setSessionCookie(token);

  await repos.auditLogs.create({
    user_id: user.id,
    action: "login",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  return { userId: user.id, role: user.role };
}
