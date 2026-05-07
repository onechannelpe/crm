/**
 * Redis pub/sub channel names for job queues.
 * Both the web process (publisher) and worker process (subscriber) import from here.
 */
export const JOB_CHANNELS = {
  CRM_EXPORT: "job:crm-export",
  RECORDS_IMPORT: "job:records-import",
  RECORDS_IMPORT_PROGRESS: "job:records-import-progress",
  WORKFLOW_NOTIFICATION_OUTBOX: "job:workflow-notification-outbox",
  ENRICHMENT: "job:enrichment",
  ENRICHMENT_WRITEBACK: "job:enrichment-writeback",
  NOTIFICATIONS_EMAIL: "job:notifications-email",
  NOTIFICATIONS_WHATSAPP: "job:notifications-whatsapp",
  NOTIFICATIONS_INTENTS: "job:notifications-intents",
} as const;

export type JobChannel = (typeof JOB_CHANNELS)[keyof typeof JOB_CHANNELS];
