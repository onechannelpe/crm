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
  },
  quota: {
    minAmount: 1,
    maxAmount: 100,
  },
  uploads: {
    maxFileSizeMB: 10,
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],
  },
  session: {
    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
  },
} as const;
