export const DEFAULT_UPLOAD_POLICY = {
  maxFileSizeBytes: 20 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  retentionDays: 90,
  hardDeleteEnabled: 1,
  retentionSweepIntervalMs: 60 * 60 * 1000,
} as const;

export const DEFAULT_UPLOAD_POLICY_ALLOWED_TYPES_JSON = JSON.stringify(
  DEFAULT_UPLOAD_POLICY.allowedMimeTypes,
);
