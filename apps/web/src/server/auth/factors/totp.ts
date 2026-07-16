import type { Selectable } from "kysely";

import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import type { UsersTable } from "~/lib/db/types";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { Err, Ok, type Result } from "~/server/shared/result";

type UserRow = Selectable<UsersTable>;

type Deps = {
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

export type TotpStepUpError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

export async function verifyTotpStepUp(params: {
  user: UserRow;
  ipAddress: string;
  totpCode?: string;
  deps: Deps;
  occurredAt: Date;
}): Promise<
  Result<
    {
      strongAuthMethod: "totp";
      strongAuthAt: Date;
      secretEncrypted: string;
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

  if (!safeCode || !factor || !factor.is_enabled) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "totp",
      stage: "verify",
      outcome: "failure",
      reason: "strong_auth_factor_missing",
      occurredAt: params.occurredAt,
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
      occurredAt: params.occurredAt,
    });
    return Err({ kind: "invalid_totp" });
  }

  const secret = await decryptTotpSecret(factor.secret_encrypted);
  if (verifyTotpCode(secret, safeCode)) {
    return Ok({
      strongAuthMethod: "totp",
      strongAuthAt: params.occurredAt,
      secretEncrypted: factor.secret_encrypted,
    });
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
    occurredAt: params.occurredAt,
  });
  return Err({ kind: "invalid_totp" });
}
