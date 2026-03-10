import { forbiddenError } from "~/lib/app-errors";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import {
  createSession,
  invalidateSession,
} from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import type { User } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";

type SessionAuditDeps = Pick<Repositories, "auditLogs" | "sessions" | "users">;

type SessionUser = Pick<
  User,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

export interface LoginCompletionResult {
  userId: number;
  role: User["role"];
  onboardingCompleted: boolean;
  token: string;
}

export async function replaceCurrentSession(token: string): Promise<void> {
  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  setSessionCookie(token);
}

export async function issueLoginSession(params: {
  user: SessionUser | null;
  ipAddress: string;
  userAgent: string | null;
  authMethod: "password" | "password_totp" | "passkey" | "google";
  strongAuthAt: number | null;
  auditAction: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<LoginCompletionResult> {
  const { user } = params;
  if (!user) throw forbiddenError("Invalid credentials");

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    params.ipAddress,
    params.userAgent,
    params.authMethod,
    params.strongAuthAt,
    params.deps,
  );

  await params.deps.auditLogs.create({
    user_id: user.id,
    action: params.auditAction,
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  return {
    userId: user.id,
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
    token,
  };
}
