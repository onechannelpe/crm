export const AUTH_LOGIN_FLOW_TTL_MS = 10 * 60_000;
export const AUTH_WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60_000;
export const AUTH_STRONG_AUTH_MAX_AGE_MS = 15 * 60_000;

export const AUTH_MAINTENANCE_RETENTION = {
  throttleMs: 7 * 24 * 60 * 60 * 1000,
  eventsMs: 90 * 24 * 60 * 60 * 1000,
  observationsMs: 90 * 24 * 60 * 60 * 1000,
  rateLimitsMs: 24 * 60 * 60 * 1000,
} as const;
