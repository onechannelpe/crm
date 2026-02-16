import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";

export type ScopePolicy = {
  threshold: number;
  windowMs: number;
  baseBlockMs: number;
  maxBlockMs: number;
};

export const AUTH_THROTTLE_POLICY: Record<AuthThrottleScope, ScopePolicy> = {
  ip: {
    threshold: 30,
    windowMs: 10 * 60_000,
    baseBlockMs: 60_000,
    maxBlockMs: 10 * 60_000,
  },
  account: {
    threshold: 5,
    windowMs: 15 * 60_000,
    baseBlockMs: 60_000,
    maxBlockMs: 15 * 60_000,
  },
  ip_account: {
    threshold: 5,
    windowMs: 5 * 60_000,
    baseBlockMs: 60_000,
    maxBlockMs: 10 * 60_000,
  },
};

export const AUTH_THROTTLE_SCOPES = ["ip", "account", "ip_account"] as const;
