export const config = {
  leadAssignment: {
    ttlHours: 24,
    defaultBufferTarget: 10,
    defaultDailyRefillLimit: 25,
    maxBufferTarget: 50,
  },
  searchAccess: {
    defaultMonthlyLimit: 250,
    maxMonthlyLimit: 5_000,
  },
  capacityRequests: {
    defaultSearchRequestAmount: 25,
    defaultLeadRefillRequestAmount: 10,
    maxRequestAmount: 500,
  },
  contactCooldown: {
    defaultHours: 24,
  },
  uploads: {
    storageRoot: process.env.WEB_UPLOADS_ROOT ?? ".local-storage/documents",
  },
  session: {
    maxAgeSeconds: 60 * 60 * 24 * 30,
  },
  auth: {
    loginFlowTtlMs: 10 * 60_000,
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
