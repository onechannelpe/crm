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

import type { LoginDecision } from "../policy/policy-types";

type SessionAuditDeps = Pick<Repositories, "auditLogs" | "sessions" | "users">;

type SessionUser = Pick<
  User,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

export interface SessionRequestMetadata {
  ipAddress: string;
  userAgent: string | null;
}

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

interface TransitionSessionParams {
  user: SessionUser | null;
  sessionClass: SessionClass;
  request: SessionRequestMetadata;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}

async function transitionSession(
  params: TransitionSessionParams,
): Promise<IssuedSessionResult> {
  const { user } = params;
  if (!user) {
    throw forbiddenError("Invalid credentials");
  }

  const token = await createSession(
    {
      userId: user.id,
      branchId: user.branch_id,
      role: user.role,
      sessionClass: params.sessionClass,
      ipAddress: params.request.ipAddress,
      userAgent: params.request.userAgent,
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

export async function issueLoginSession(params: {
  user: SessionUser | null;
  decision: Extract<LoginDecision, { kind: "issue_session" }>;
  request: SessionRequestMetadata;
  primaryAuthMethod: PrimaryAuthMethod;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<IssuedSessionResult> {
  return transitionSession({
    user: params.user,
    sessionClass: params.decision.sessionClass,
    request: params.request,
    primaryAuthMethod: params.primaryAuthMethod,
    strongAuthMethod: params.decision.strongAuthMethod,
    strongAuthAt: params.decision.strongAuthAt,
    auditAction: params.auditAction,
    deps: params.deps,
  });
}

export async function issueSessionTransition(params: {
  user: SessionUser | null;
  sessionClass: SessionClass;
  request: SessionRequestMetadata;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
  deps: SessionAuditDeps;
}): Promise<IssuedSessionResult> {
  return transitionSession(params);
}
