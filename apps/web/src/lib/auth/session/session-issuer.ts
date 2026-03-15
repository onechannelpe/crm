import { forbiddenError } from "~/lib/app-errors";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
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

export interface IssuedSessionResult {
  userId: number;
  role: User["role"];
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  token: string;
}

async function issueSession(params: {
  user: SessionUser | null;
  sessionClass: SessionClass;
  ipAddress: string;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<IssuedSessionResult> {
  const { user } = params;
  if (!user) throw forbiddenError("Invalid credentials");

  const token = await createSession(
    {
      userId: user.id,
      branchId: user.branch_id,
      role: user.role,
      sessionClass: params.sessionClass,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      primaryAuthMethod: params.primaryAuthMethod,
      strongAuthMethod: params.strongAuthMethod,
      strongAuthAt: params.strongAuthAt,
    },
    params.deps,
  );

  if (params.auditAction) {
    await params.deps.auditLogs.create({
      user_id: user.id,
      action: params.auditAction,
      entity_type: "user",
      entity_id: user.id,
      changes: null,
      created_at: Date.now(),
    });
  }

  return {
    userId: user.id,
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
    sessionClass: params.sessionClass,
    primaryAuthMethod: params.primaryAuthMethod,
    strongAuthMethod: params.strongAuthMethod,
    strongAuthAt: params.strongAuthAt,
    token,
  };
}

export async function replaceCurrentSession(token: string): Promise<void> {
  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  setSessionCookie(token);
}

export async function issuePreAuthSession(params: {
  user: SessionUser | null;
  ipAddress: string;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<IssuedSessionResult> {
  return issueSession({
    ...params,
    sessionClass: "pre_auth",
  });
}

export async function issueAppSession(params: {
  user: SessionUser | null;
  ipAddress: string;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<IssuedSessionResult> {
  return issueSession({
    ...params,
    sessionClass: "app",
  });
}
