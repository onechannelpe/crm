import { repos } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";
import { AUTH_THROTTLE_POLICY, AUTH_THROTTLE_SCOPES } from "./throttle-policy";
import { buildThrottleKeys } from "./throttle-keys";
import { calculateBlockMs, isThrottleWindowExpired } from "./throttle-state";

type Deps = Pick<Repositories, "authThrottle">;
type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export async function checkLoginThrottle(
  email: string,
  ip: string,
  deps?: Deps,
): Promise<CheckResult> {
  const now = Date.now();
  const resolvedDeps = deps ?? repos;
  const keyMap = buildThrottleKeys(email, ip);
  const rows = await Promise.all(
    AUTH_THROTTLE_SCOPES.map((scope) =>
      resolvedDeps.authThrottle.findByScopeAndKey(scope, keyMap[scope]),
    ),
  );
  for (const [index, row] of rows.entries()) {
    const scope = AUTH_THROTTLE_SCOPES[index];
    if (!row || isThrottleWindowExpired(scope, now, row.window_started_at))
      continue;
    if (row.blocked_until && row.blocked_until > now) {
      return { allowed: false, retryAfterMs: row.blocked_until - now };
    }
  }
  return { allowed: true };
}

export async function recordLoginFailure(
  email: string,
  ip: string,
  deps?: Deps,
): Promise<void> {
  const now = Date.now();
  const keyMap = buildThrottleKeys(email, ip);
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
        !row || isThrottleWindowExpired(scope, now, row.window_started_at);
      const failures = reset ? 1 : row.failure_count + 1;
      const block = failures > AUTH_THROTTLE_POLICY[scope].threshold;
      const blockedUntil = block
        ? now + calculateBlockMs(scope, failures)
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

export async function clearLoginFailureState(
  email: string,
  ip: string,
  deps?: Deps,
): Promise<void> {
  const resolvedDeps = deps ?? repos;
  const keyMap = buildThrottleKeys(email, ip);
  await resolvedDeps.authThrottle.deleteByScopeAndKey(
    "account",
    keyMap.account,
  );
  await resolvedDeps.authThrottle.deleteByScopeAndKey(
    "ip_account",
    keyMap.ip_account,
  );
}
