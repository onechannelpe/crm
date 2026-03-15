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

import { recordAuthEvent } from "../security/auth-events";

type Deps = Pick<
  Repositories,
  "userTotpFactors" | "userTotpRecoveryCodes" | "authThrottle" | "authEvents"
>;

export type TotpStepUpError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

export async function verifyTotpStepUp(params: {
  user: User;
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
    await clearTotpVerifyFailureState(identifier, ipAddress, deps);
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
