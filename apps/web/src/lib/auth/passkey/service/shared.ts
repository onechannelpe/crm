import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { AuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { LoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { UserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { AuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { PasskeysRepo } from "~/server/users/repos-passkeys";
import type { UsersRepo } from "~/server/users/repos-users";
import type { WebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import type { BeginPasskeyLoginError, FinishPasskeyLoginError } from "./types";

export type PasskeyAuthRepos = {
  users: UsersRepo;
  sessions: SessionRepository;
  loginFlows: LoginFlowsRepo;
  passkeys: PasskeysRepo;
  webauthnChallenges: WebauthnChallengesRepo;
  auditLogs: AuditLogsRepo;
  authThrottle: AuthThrottleRepo;
  authEvents: AuthEventsRepo;
  userTotpFactors: UserTotpFactorsRepo;
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
