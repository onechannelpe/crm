import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";

export type ScopePolicy = {
  threshold: number;
  windowMs: number;
  baseBlockMs: number;
  maxBlockMs: number;
};

export type AuthThrottleEndpoint =
  | "password_login"
  | "passkey_challenge"
  | "passkey_verify"
  | "totp_verify"
  | "recovery_verify";

export const AUTH_THROTTLE_POLICY: Record<
  AuthThrottleEndpoint,
  Record<AuthThrottleScope, ScopePolicy>
> = {
  password_login: {
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
  },
  passkey_challenge: {
    ip: {
      threshold: 40,
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
    account: {
      threshold: 8,
      windowMs: 15 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 15 * 60_000,
    },
    ip_account: {
      threshold: 8,
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
  },
  passkey_verify: {
    ip: {
      threshold: 30,
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
    account: {
      threshold: 8,
      windowMs: 15 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 15 * 60_000,
    },
    ip_account: {
      threshold: 8,
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
  },
  totp_verify: {
    ip: {
      threshold: 20,
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
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
  },
  recovery_verify: {
    ip: {
      threshold: 15,
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
      windowMs: 10 * 60_000,
      baseBlockMs: 60_000,
      maxBlockMs: 10 * 60_000,
    },
  },
};

export const AUTH_THROTTLE_SCOPES = ["ip", "account", "ip_account"] as const;
