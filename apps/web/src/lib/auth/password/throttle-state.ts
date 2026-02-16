import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";

import {
  AUTH_THROTTLE_POLICY,
  type AuthThrottleEndpoint,
} from "./throttle-policy";

export function isThrottleWindowExpired(
  endpoint: AuthThrottleEndpoint,
  scope: AuthThrottleScope,
  now: number,
  startedAt: number,
): boolean {
  return now - startedAt >= AUTH_THROTTLE_POLICY[endpoint][scope].windowMs;
}

export function calculateBlockMs(
  endpoint: AuthThrottleEndpoint,
  scope: AuthThrottleScope,
  failures: number,
): number {
  const policy = AUTH_THROTTLE_POLICY[endpoint][scope];
  const overThreshold = Math.max(0, failures - policy.threshold);
  const backoff = policy.baseBlockMs * 2 ** overThreshold;
  return Math.min(backoff, policy.maxBlockMs);
}
