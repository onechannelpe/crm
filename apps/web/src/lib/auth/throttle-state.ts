import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";
import { AUTH_THROTTLE_POLICY } from "./throttle-policy";

export function isThrottleWindowExpired(
  scope: AuthThrottleScope,
  now: number,
  startedAt: number,
): boolean {
  return now - startedAt >= AUTH_THROTTLE_POLICY[scope].windowMs;
}

export function calculateBlockMs(
  scope: AuthThrottleScope,
  failures: number,
): number {
  const policy = AUTH_THROTTLE_POLICY[scope];
  const overThreshold = Math.max(0, failures - policy.threshold);
  const backoff = policy.baseBlockMs * 2 ** overThreshold;
  return Math.min(backoff, policy.maxBlockMs);
}
