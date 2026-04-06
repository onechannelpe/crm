import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createUsersRepo } from "~/server/users/repos-users";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import type { BeginPasskeyLoginError, FinishPasskeyLoginError } from "./types";

export type PasskeyAuthRepos = {
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
};

export const INVALID_PASSKEY_REQUEST = "Invalid passkey request";
export const UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE =
  "Unexpected passkey registration failure";
export const UNEXPECTED_PASSKEY_LOGIN_FAILURE =
  "Unexpected passkey login failure";

export function unexpectedPasskeyLoginError(): {
  kind: "unexpected";
  message: string;
} {
  return {
    kind: "unexpected",
    message: UNEXPECTED_PASSKEY_LOGIN_FAILURE,
  };
}

export function normalizePasskeyIdentifier(
  identifier: string,
): string | BeginPasskeyLoginError {
  try {
    return assertNonEmptyString(identifier, "identifier").trim();
  } catch {
    return { kind: "invalid_credentials" };
  }
}

export function normalizePasskeyFlowId(
  flowId: number,
): number | FinishPasskeyLoginError {
  try {
    return assertPositiveInt(flowId, "flowId");
  } catch {
    return { kind: "flow_expired" };
  }
}
