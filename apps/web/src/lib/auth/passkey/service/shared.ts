import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";

import type { BeginPasskeyLoginError, FinishPasskeyLoginError } from "./types";

export type PasskeyAuthRepos = Pick<
  Repositories,
  | "users"
  | "sessions"
  | "loginFlows"
  | "passkeys"
  | "webauthnChallenges"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
>;

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
