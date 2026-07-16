import { buildThrottleKeys } from "~/lib/auth/password/throttle-keys";
import {
  AUTH_THROTTLE_POLICY,
  AUTH_THROTTLE_SCOPES,
  type AuthThrottleEndpoint,
} from "~/lib/auth/password/throttle-policy";
import {
  calculateBlockMs,
  isThrottleWindowExpired,
} from "~/lib/auth/password/throttle-state";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";

type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export interface AuthThrottleServiceDeps {
  authThrottle: AuthThrottleRepo;
  now?: () => Date;
}

export function createAuthThrottleService(deps: AuthThrottleServiceDeps) {
  const now = deps.now ?? (() => new Date());

  async function checkThrottle(
    endpoint: AuthThrottleEndpoint,
    identifier: string,
    ipAddress: string,
  ): Promise<CheckResult> {
    const nowTs = now();
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
        isThrottleWindowExpired(endpoint, scope, nowTs, row.window_started_at)
      ) {
        continue;
      }
      if (row.blocked_until && row.blocked_until > nowTs) {
        return {
          allowed: false,
          retryAfterMs: row.blocked_until.getTime() - nowTs.getTime(),
        };
      }
    }

    return { allowed: true };
  }

  async function recordFailure(
    endpoint: AuthThrottleEndpoint,
    identifier: string,
    ipAddress: string,
  ): Promise<void> {
    const nowTs = now();
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
          isThrottleWindowExpired(
            endpoint,
            scope,
            nowTs,
            row.window_started_at,
          );
        const failures = reset ? 1 : row.failure_count + 1;
        const block =
          failures > AUTH_THROTTLE_POLICY[endpoint][scope].threshold;
        const blockedUntil = block
          ? new Date(
              nowTs.getTime() + calculateBlockMs(endpoint, scope, failures),
            )
          : null;
        return deps.authThrottle.upsert({
          scope,
          key_hash: keyMap[scope],
          window_started_at: reset ? nowTs : row.window_started_at,
          failure_count: failures,
          blocked_until: blockedUntil,
          updated_at: nowTs,
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
    checkLoginThrottle(email: string, ipAddress: string): Promise<CheckResult> {
      return checkThrottle("password_login", email, ipAddress);
    },

    recordLoginFailure(email: string, ipAddress: string): Promise<void> {
      return recordFailure("password_login", email, ipAddress);
    },

    clearLoginFailureState(email: string, ipAddress: string): Promise<void> {
      return clearFailureState("password_login", email, ipAddress);
    },

    checkPasskeyChallengeThrottle(
      identifier: string,
      ipAddress: string,
    ): Promise<CheckResult> {
      return checkThrottle("passkey_challenge", identifier, ipAddress);
    },

    recordPasskeyChallengeFailure(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return recordFailure("passkey_challenge", identifier, ipAddress);
    },

    checkPasskeyVerifyThrottle(
      identifier: string,
      ipAddress: string,
    ): Promise<CheckResult> {
      return checkThrottle("passkey_verify", identifier, ipAddress);
    },

    recordPasskeyVerifyFailure(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return recordFailure("passkey_verify", identifier, ipAddress);
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
    ): Promise<CheckResult> {
      return checkThrottle("totp_verify", identifier, ipAddress);
    },

    recordTotpVerifyFailure(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return recordFailure("totp_verify", identifier, ipAddress);
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
    ): Promise<CheckResult> {
      return checkThrottle("recovery_verify", identifier, ipAddress);
    },

    recordRecoveryVerifyFailure(
      identifier: string,
      ipAddress: string,
    ): Promise<void> {
      return recordFailure("recovery_verify", identifier, ipAddress);
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
