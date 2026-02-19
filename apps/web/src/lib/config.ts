export const config = {
  leadAssignment: {
    ttlHours: 24,
    defaultBufferSize: 10,
    maxBufferSize: 50,
  },
  contactCooldown: {
    defaultHours: 24,
  },
  inventoryLock: {
    expiryMinutes: 30,
    cleanupIntervalMs: 60_000,
  },
  quota: {
    minAmount: 1,
    maxAmount: 100,
  },
  uploads: {
    storageRoot: process.env.CRM_UPLOADS_ROOT ?? ".local-storage/documents",
    maxFileSizeMB: 20,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    retentionDays: 90,
    hardDeleteEnabled: 1,
    retentionSweepIntervalMs: 60 * 60 * 1000,
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
} as const;
