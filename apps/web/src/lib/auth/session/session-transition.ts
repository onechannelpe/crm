import type { Selectable } from "kysely";

import { forbiddenError } from "~/lib/app-errors";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import type { UsersTable } from "~/lib/db/types";
import { serverRuntime } from "~/server/runtime";
import type { UserId } from "~/server/shared/ids";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { LoginDecision } from "../policy/policy-types";
import { mapUserToSessionIdentity } from "./session-mappers";

type SessionAuditDeps = {
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
};

type UserRow = Selectable<UsersTable>;

type SessionUser = Pick<
  UserRow,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

export interface SessionRequestMetadata {
  ipAddress: string;
  userAgent: string | null;
}

export interface IssuedSessionResult {
  userId: UserId;
  role: UserRow["role"];
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

  const identity = mapUserToSessionIdentity(user);

  const token = await serverRuntime.auth.sessionService.createSession({
    userId: identity.userId,
    branchId: identity.branchId,
    role: identity.role,
    sessionClass: params.sessionClass,
    ipAddress: params.request.ipAddress,
    userAgent: params.request.userAgent,
    primaryAuthMethod: params.primaryAuthMethod,
    strongAuthMethod: params.strongAuthMethod,
    strongAuthAt: params.strongAuthAt,
  });

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
    userId: identity.userId,
    role: identity.role,
    onboardingCompleted: identity.onboardingCompleted,
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
    await serverRuntime.auth.sessionService
      .invalidateSession(oldSessionId)
      .catch(() => {});
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
