import {
  checkTotpVerifyThrottle,
  clearTotpVerifyFailureState,
  recordTotpVerifyFailure,
} from "~/lib/auth/password/throttle";
import { matchesRecoveryCode } from "~/lib/auth/totp/recovery-codes";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import type { User } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  InvalidTotpError,
  PasskeyRequiredError,
  StrongAuthRequiredError,
} from "../errors";
import { getPasswordLoginPolicy } from "./auth-contract";
import { recordAuthEvent } from "./auth-events";
import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "./strong-auth-status";

type Deps = Pick<
  Repositories,
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "authThrottle"
  | "authEvents"
  | "passkeys"
>;

export type PasswordStrongAuthError =
  | StrongAuthRequiredError
  | PasskeyRequiredError
  | InvalidTotpError;

export async function resolvePasswordStrongAuth(params: {
  user: User;
  ipAddress: string;
  totpCode?: string;
  deps: Deps;
}): Promise<
  Result<
    {
      authMethod: "password" | "password_totp";
      strongAuthAt: number | null;
    },
    PasswordStrongAuthError
  >
> {
  const { user, ipAddress, totpCode, deps } = params;
  if (!requiresStrongAuthRole(user.role)) {
    return Ok({ authMethod: "password", strongAuthAt: null });
  }

  const identifier = `user:${user.id}`;
  const [factor, strongAuthStatus] = await Promise.all([
    deps.userTotpFactors.findByUserId(user.id),
    getStrongAuthStatus(user.id, deps),
  ]);
  const passwordLoginPolicy = getPasswordLoginPolicy({
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
    strongAuthStatus,
  });
  const safeCode = totpCode?.trim();
  if (passwordLoginPolicy === "password_bootstrap") {
    return Ok({ authMethod: "password", strongAuthAt: null });
  }
  if (passwordLoginPolicy === "password_or_totp" && !strongAuthStatus.hasTotp) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: strongAuthStatus.hasPasskey
        ? "strong_auth_passkey_required"
        : "strong_auth_factor_missing",
    });
    return Err({
      kind: strongAuthStatus.hasPasskey
        ? "passkey_required"
        : "strong_auth_required",
    });
  }
  if (!strongAuthStatus.hasVerifiedStrongAuth) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_not_enrolled",
    });
    return Err({ kind: "strong_auth_required" });
  }
  if (passwordLoginPolicy === "passkey_only") {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_passkey_required",
    });
    return Err({ kind: "passkey_required" });
  }
  if (!safeCode) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_missing",
    });
    return Err({ kind: "strong_auth_required" });
  }
  if (!factor) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_factor_missing",
    });
    return Err({ kind: "strong_auth_required" });
  }

  const throttle = await checkTotpVerifyThrottle(identifier, ipAddress, deps);
  if (!throttle.allowed) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    return Err({ kind: "invalid_totp" });
  }

  const secret = await decryptTotpSecret(factor.secret_encrypted);
  if (verifyTotpCode(secret, safeCode)) {
    await clearTotpVerifyFailureState(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "success",
    });
    return Ok({ authMethod: "password_totp", strongAuthAt: Date.now() });
  }

  const recoveryCodes = await deps.userTotpRecoveryCodes.listUnusedByUser(
    user.id,
  );
  const recoveryMatch = (
    await Promise.all(
      recoveryCodes.map(async (recovery) => ({
        recovery,
        matches: await matchesRecoveryCode(safeCode, recovery.code_hash),
      })),
    )
  ).find((candidate) => candidate.matches);
  if (recoveryMatch) {
    await deps.userTotpRecoveryCodes.markUsed(recoveryMatch.recovery.id);
    await clearTotpVerifyFailureState(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "recovery",
      outcome: "success",
    });
    return Ok({ authMethod: "password_totp", strongAuthAt: Date.now() });
  }

  await recordTotpVerifyFailure(identifier, ipAddress, deps);
  await recordAuthEvent(deps, {
    userId: user.id,
    identifier,
    ipAddress,
    method: "totp",
    stage: "verify",
    outcome: "failure",
    reason: "invalid_token",
  });
  return Err({ kind: "invalid_totp" });
}
