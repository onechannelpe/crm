/**
 * Redis pub/sub channel names for job queues.
 * Both the web process (publisher) and worker process (subscriber) import from here.
 */
export const JOB_CHANNELS = {
  CRM_EXPORT: "job:crm-export",
  CRM_IMPORT: "job:crm-import",
  INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT:
    "job:integration-outbox-needs-executive-input",
  INTEGRATION_OUTBOX_READY_FOR_QUOTATION:
    "job:integration-outbox-ready-for-quotation",
  SALES_EXPORT: "job:sales-export",
  ENRICHMENT: "job:enrichment",
  ENRICHMENT_WRITEBACK: "job:enrichment-writeback",
} as const;

export type JobChannel = (typeof JOB_CHANNELS)[keyof typeof JOB_CHANNELS];
