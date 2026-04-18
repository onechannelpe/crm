import type { Selectable } from "kysely";

import { matchesRecoveryCode } from "~/lib/auth/totp/recovery-codes";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import type { UsersTable } from "~/lib/db/types";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UserWithBrandedIds } from "~/server/users/repos-users";

import { recordAuthEvent } from "../security/auth-events";

// UserRow removed, using UserWithBrandedIds

type Deps = {
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userTotpRecoveryCodes: ReturnType<typeof createUserTotpRecoveryCodesRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

export type TotpStepUpError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

export async function verifyTotpStepUp(params: {
  user: UserWithBrandedIds;
  ipAddress: string;
  totpCode?: string;
  deps: Deps;
}): Promise<
  Result<
    {
      strongAuthMethod: "totp";
      strongAuthAt: number;
    },
    TotpStepUpError
  >
> {
  const { user, ipAddress, totpCode, deps } = params;
  const throttleService = createAuthThrottleService({
    authThrottle: deps.authThrottle,
  });
  const identifier = `user:${user.id}`;
  const safeCode = totpCode?.trim();
  const factor = await deps.userTotpFactors.findByUserId(user.id);

  if (!safeCode || !factor || factor.is_enabled !== 1) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_factor_missing",
    });
    return Err({ kind: "invalid_totp" });
  }

  const throttle = await throttleService.checkTotpVerifyThrottle(
    identifier,
    ipAddress,
  );
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
    await throttleService.clearTotpVerifyFailureState(identifier, ipAddress);
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "success",
    });
    return Ok({ strongAuthMethod: "totp", strongAuthAt: Date.now() });
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
    await throttleService.clearTotpVerifyFailureState(identifier, ipAddress);
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "recovery",
      outcome: "success",
    });
    return Ok({ strongAuthMethod: "totp", strongAuthAt: Date.now() });
  }

  await throttleService.recordTotpVerifyFailure(identifier, ipAddress);
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
