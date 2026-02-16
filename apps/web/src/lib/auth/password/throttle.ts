import type { Repositories } from "~/server/shared/registry";

import { repos } from "~/server/shared/context";

import { buildThrottleKeys } from "./throttle-keys";
import {
  AUTH_THROTTLE_POLICY,
  AUTH_THROTTLE_SCOPES,
  type AuthThrottleEndpoint,
} from "./throttle-policy";
import { calculateBlockMs, isThrottleWindowExpired } from "./throttle-state";

type Deps = Pick<Repositories, "authThrottle">;
type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

async function checkThrottle(
  endpoint: AuthThrottleEndpoint,
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  const now = Date.now();
  const resolvedDeps = deps ?? repos;
  const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);

  const rows = await Promise.all(
    AUTH_THROTTLE_SCOPES.map((scope) =>
      resolvedDeps.authThrottle.findByScopeAndKey(scope, keyMap[scope]),
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
      return { allowed: false, retryAfterMs: row.blocked_until - now };
    }
  }

  return { allowed: true };
}

async function recordFailure(
  endpoint: AuthThrottleEndpoint,
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  const now = Date.now();
  const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);
  const resolvedDeps = deps ?? repos;

  const rows = await Promise.all(
    AUTH_THROTTLE_SCOPES.map((scope) =>
      resolvedDeps.authThrottle.findByScopeAndKey(scope, keyMap[scope]),
    ),
  );
  await Promise.all(
    rows.map((row, index) => {
      const scope = AUTH_THROTTLE_SCOPES[index];
      const reset =
        !row ||
        isThrottleWindowExpired(endpoint, scope, now, row.window_started_at);
      const failures = reset ? 1 : row.failure_count + 1;
      const block = failures > AUTH_THROTTLE_POLICY[endpoint][scope].threshold;
      const blockedUntil = block
        ? now + calculateBlockMs(endpoint, scope, failures)
        : null;
      return resolvedDeps.authThrottle.upsert({
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
  deps?: Deps,
): Promise<void> {
  const resolvedDeps = deps ?? repos;
  const keyMap = buildThrottleKeys(endpoint, identifier, ipAddress);
  await resolvedDeps.authThrottle.deleteByScopeAndKey(
    "account",
    keyMap.account,
  );
  await resolvedDeps.authThrottle.deleteByScopeAndKey(
    "ip_account",
    keyMap.ip_account,
  );
}

export async function checkLoginThrottle(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return checkThrottle("password_login", email, ipAddress, deps);
}

export async function recordLoginFailure(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await recordFailure("password_login", email, ipAddress, deps);
}

export async function clearLoginFailureState(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await clearFailureState("password_login", email, ipAddress, deps);
}

export async function checkPasskeyChallengeThrottle(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return checkThrottle("passkey_challenge", identifier, ipAddress, deps);
}

export async function recordPasskeyChallengeFailure(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await recordFailure("passkey_challenge", identifier, ipAddress, deps);
}

export async function checkPasskeyVerifyThrottle(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return checkThrottle("passkey_verify", identifier, ipAddress, deps);
}

export async function recordPasskeyVerifyFailure(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await recordFailure("passkey_verify", identifier, ipAddress, deps);
}

export async function clearPasskeyVerifyFailureState(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await clearFailureState("passkey_verify", identifier, ipAddress, deps);
}
