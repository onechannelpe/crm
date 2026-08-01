import { buildThrottleKeys } from "~/server/auth/password/throttle-keys";
import {
  AUTH_THROTTLE_POLICY,
  AUTH_THROTTLE_SCOPES,
  type AuthThrottleEndpoint,
} from "~/server/auth/password/throttle-policy";
import {
  calculateBlockMs,
  isThrottleWindowExpired,
} from "~/server/auth/password/throttle-state";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";

type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export interface AuthThrottleServiceDeps {
  authThrottle: AuthThrottleRepo;
}

export function createAuthThrottleService(deps: AuthThrottleServiceDeps) {
  async function checkThrottle(
    endpoint: AuthThrottleEndpoint,
    identifier: string,
    ipAddress: string,
    now: Date,
  ): Promise<CheckResult> {
    const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);

    const rows = await Promise.all(
      AUTH_THROTTLE_SCOPES.map((scope) =>
        deps.authThrottle.findByScopeAndKey(scope, keyMap[scope]),
      ),
    );

    for (const [index, row] of rows.entries()) {
      const scope = AUTH_THROTTLE_SCOPES[index];
      if (
        !row ||
        isThrottleWindowExpired(endpoint, scope, now, row.window_started_at)
      ) {
        continue;
      }
      if (row.blocked_until && row.blocked_until > now) {
        return {
          allowed: false,
          retryAfterMs: row.blocked_until.getTime() - now.getTime(),
        };
      }
    }

    return { allowed: true };
  }

  async function recordFailure(
    endpoint: AuthThrottleEndpoint,
    identifier: string,
    ipAddress: string,
    now: Date,
  ): Promise<void> {
    const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);

    const rows = await Promise.all(
      AUTH_THROTTLE_SCOPES.map((scope) =>
        deps.authThrottle.findByScopeAndKey(scope, keyMap[scope]),
      ),
    );
    await Promise.all(
      rows.map((row, index) => {
        const scope = AUTH_THROTTLE_SCOPES[index];
        const reset =
          !row ||
          isThrottleWindowExpired(endpoint, scope, now, row.window_started_at);
        const failures = reset ? 1 : row.failure_count + 1;
        const block =
          failures > AUTH_THROTTLE_POLICY[endpoint][scope].threshold;
        const blockedUntil = block
          ? new Date(
              now.getTime() + calculateBlockMs(endpoint, scope, failures),
            )
          : null;
        return deps.authThrottle.upsert({
          scope,
          key_hash: keyMap[scope],
          window_started_at: reset ? now : row.window_started_at,
          failure_count: failures,
          blocked_until: blockedUntil,
          updated_at: now,
        });
      }),
    );
  }

  async function clearFailureState(
    endpoint: AuthThrottleEndpoint,
    identifier: string,
    ipAddress: string,
  ): Promise<void> {
    const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);
    await deps.authThrottle.deleteByScopeAndKey("account", keyMap.account);
    await deps.authThrottle.deleteByScopeAndKey(
      "ip_account",
      keyMap.ip_account,
    );
  }

  return {
    checkLoginThrottle(
      email: string,
      ipAddress: string,
      now: Date,
    ): Promise<CheckResult> {
      return checkThrottle("password_login", email, ipAddress, now);
    },

    recordLoginFailure(
      email: string,
      ipAddress: string,
      now: Date,
    ): Promise<void> {
      return recordFailure("password_login", email, ipAddress, now);
    },

    clearLoginFailureState(email: string, ipAddress: string): Promise<void> {
      return clearFailureState("password_login", email, ipAddress);
    },

    checkPasskeyChallengeThrottle(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<CheckResult> {
      return checkThrottle("passkey_challenge", identifier, ipAddress, now);
    },

    recordPasskeyChallengeFailure(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<void> {
      return recordFailure("passkey_challenge", identifier, ipAddress, now);
    },

    checkPasskeyVerifyThrottle(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<CheckResult> {
      return checkThrottle("passkey_verify", identifier, ipAddress, now);
    },

    recordPasskeyVerifyFailure(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<void> {
      return recordFailure("passkey_verify", identifier, ipAddress, now);
    },

    clearPasskeyVerifyFailureState(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return clearFailureState("passkey_verify", identifier, ipAddress);
    },

    checkTotpVerifyThrottle(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<CheckResult> {
      return checkThrottle("totp_verify", identifier, ipAddress, now);
    },

    recordTotpVerifyFailure(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<void> {
      return recordFailure("totp_verify", identifier, ipAddress, now);
    },

    clearTotpVerifyFailureState(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return clearFailureState("totp_verify", identifier, ipAddress);
    },

    checkRecoveryVerifyThrottle(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<CheckResult> {
      return checkThrottle("recovery_verify", identifier, ipAddress, now);
    },

    recordRecoveryVerifyFailure(
      identifier: string,
      ipAddress: string,
      now: Date,
    ): Promise<void> {
      return recordFailure("recovery_verify", identifier, ipAddress, now);
    },

    clearRecoveryVerifyFailureState(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return clearFailureState("recovery_verify", identifier, ipAddress);
    },
  };
}

export type AuthThrottleService = ReturnType<typeof createAuthThrottleService>;
