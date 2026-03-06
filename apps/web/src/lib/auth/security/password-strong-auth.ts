import {
  checkTotpVerifyThrottle,
  clearTotpVerifyFailureState,
  recordTotpVerifyFailure,
} from "~/lib/auth/password/throttle";
import { matchesRecoveryCode } from "~/lib/auth/totp/recovery-codes";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import type { User } from "~/lib/db/schema";
import type { Repositories } from "~/server/shared/registry";

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

export async function resolvePasswordStrongAuth(params: {
  user: User;
  ipAddress: string;
  totpCode?: string;
  deps: Deps;
}): Promise<{
  authMethod: "password" | "password_totp";
  strongAuthAt: number | null;
}> {
  const { user, ipAddress, totpCode, deps } = params;
  if (!requiresStrongAuthRole(user.role)) {
    return { authMethod: "password", strongAuthAt: null };
  }

  const identifier = `user:${user.id}`;
  const [factor, strongAuthStatus] = await Promise.all([
    deps.userTotpFactors.findByUserId(user.id),
    getStrongAuthStatus(user.id, deps),
  ]);
  const hasTotp = strongAuthStatus.hasTotp;
  const safeCode = totpCode?.trim();
  if (!strongAuthStatus.hasVerifiedStrongAuth) {
    if (user.onboarding_completed_at === null) {
      return { authMethod: "password", strongAuthAt: null };
    }
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_not_enrolled",
    });
    throw new Error("Strong authentication required");
  }
  if (!hasTotp) {
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
    throw new Error(
      strongAuthStatus.hasPasskey
        ? "Use a passkey or configure an authenticator app"
        : "Strong authentication required",
    );
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
    throw new Error("Strong authentication required");
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
    throw new Error("Strong authentication required");
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
    throw new Error("Invalid TOTP code");
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
    return { authMethod: "password_totp", strongAuthAt: Date.now() };
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
    return { authMethod: "password_totp", strongAuthAt: Date.now() };
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
  throw new Error("Invalid TOTP code");
}
