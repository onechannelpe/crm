/**
 * Redis pub/sub channel names for job queues.
 * Both the web process (publisher) and worker process (subscriber) import from here.
 */
export const JOB_CHANNELS = {
  RECORDS_IMPORT: "job:records-import",
  RECORDS_IMPORT_PROGRESS: "job:records-import-progress",
  ENRICHMENT: "job:enrichment",
  ENRICHMENT_WRITEBACK: "job:enrichment-writeback",
  NOTIFICATIONS_INTENTS: "job:notifications-intents",
  NOTIFICATIONS_DELIVERIES: "job:notifications-deliveries",
} as const;

export type JobChannel = (typeof JOB_CHANNELS)[keyof typeof JOB_CHANNELS];
