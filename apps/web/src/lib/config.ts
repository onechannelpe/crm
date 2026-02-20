import { DEFAULT_UPLOAD_POLICY } from "~/lib/uploads/policy-defaults";

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
    maxFileSizeMB: DEFAULT_UPLOAD_POLICY.maxFileSizeBytes / (1024 * 1024),
    allowedTypes: DEFAULT_UPLOAD_POLICY.allowedMimeTypes,
    retentionDays: DEFAULT_UPLOAD_POLICY.retentionDays,
    hardDeleteEnabled: DEFAULT_UPLOAD_POLICY.hardDeleteEnabled,
    retentionSweepIntervalMs: DEFAULT_UPLOAD_POLICY.retentionSweepIntervalMs,
    integrityScanIntervalMs: 60 * 60 * 1000,
    integrityScanBatchSize: 200,
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
