export const config = {
  leadAssignment: {
    ttlHours: 24,
    defaultBufferSize: 10,
    maxBufferSize: 50,
  },
  contactCooldown: {
    defaultHours: 24,
  },
  quota: {
    minAmount: 1,
    maxAmount: 100,
  },
  uploads: {
    storageRoot: process.env.WEB_UPLOADS_ROOT ?? ".local-storage/documents",
  },
  session: {
    maxAgeSeconds: 60 * 60 * 24 * 30,
  },
  auth: {
    webauthnChallengeTtlMs: 5 * 60_000,
    throttleRetentionMs: 7 * 24 * 60 * 60 * 1000,
    eventsRetentionMs: 90 * 24 * 60 * 60 * 1000,
    strongAuthMaxAgeMs: 15 * 60_000,
  },
  observability: {
    retentionMs: 90 * 24 * 60 * 60 * 1000,
  },
  security: {
    rateLimitRetentionMs: 24 * 60 * 60 * 1000,
  },
} as const;
