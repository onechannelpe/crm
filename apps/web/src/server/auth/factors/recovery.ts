import type { Selectable } from "kysely";

import { hashRecoveryCode } from "~/lib/auth/recovery/recovery-codes";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import type { UsersTable } from "~/lib/db/types";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { UserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { Err, Ok, type Result } from "~/server/shared/result";

type UserRow = Selectable<UsersTable>;

type Deps = {
  userRecoveryCodes: UserRecoveryCodesRepo;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

// Recovery codes satisfy strong auth for either enabled factor. The repository
// consumes them atomically, so a code cannot be reused.
export async function verifyRecoveryCode(params: {
  user: UserRow;
  ipAddress: string;
  recoveryCode?: string;
  deps: Deps;
}): Promise<
  Result<
    { strongAuthMethod: "recovery"; strongAuthAt: Date },
    { kind: "invalid_recovery" }
  >
> {
  const { user, ipAddress, recoveryCode, deps } = params;
  const safeCode = recoveryCode?.trim();
  if (!safeCode) {
    return Err({ kind: "invalid_recovery" });
  }

  const throttleService = createAuthThrottleService({
    authThrottle: deps.authThrottle,
  });
  const identifier = `user:${user.id}`;

  const throttle = await throttleService.checkRecoveryVerifyThrottle(
    identifier,
    ipAddress,
  );
  if (!throttle.allowed) {
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "recovery",
      stage: "recovery",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    return Err({ kind: "invalid_recovery" });
  }

  const consumed = await deps.userRecoveryCodes.consumeActiveCode(
    user.id,
    hashRecoveryCode(safeCode),
  );

  if (!consumed) {
    await throttleService.recordRecoveryVerifyFailure(identifier, ipAddress);
    await recordAuthEvent(deps, {
      userId: user.id,
      identifier,
      ipAddress,
      method: "recovery",
      stage: "recovery",
      outcome: "failure",
      reason: "invalid_token",
    });
    return Err({ kind: "invalid_recovery" });
  }

  await throttleService.clearRecoveryVerifyFailureState(identifier, ipAddress);
  await recordAuthEvent(deps, {
    userId: user.id,
    identifier,
    ipAddress,
    method: "recovery",
    stage: "recovery",
    outcome: "success",
  });

  return Ok({ strongAuthMethod: "recovery", strongAuthAt: new Date() });
}
