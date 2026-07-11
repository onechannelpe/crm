import type { LifecycleColumns } from "./job-store";

// One map defines the channel and table-name unions. Adding a queue requires
// one entry instead of updates to separate lists.
export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  company_registry_record: "job:enrichment",
  notification_intents: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
  whatsapp_inbound_events: "job:whatsapp-inbound-events",
  outbound_whatsapp_messages: "job:outbound-whatsapp-messages",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;
export type JobChannel = (typeof JOB_TABLE_CHANNELS)[JobTableName];

// The job store and stale-lease scanner use this map to update each table's
// lifecycle columns.
export const JOB_TABLE_LIFECYCLE: Record<JobTableName, LifecycleColumns> = {
  workflow_integration_jobs: {
    finishedAt: "completed_at",
    error: "error_message",
    status: {
      column: "status",
      pending: "PENDING",
      processing: "PROCESSING",
      done: "COMPLETED",
      failed: "FAILED",
    },
  },
  company_registry_record: { error: "last_error" },
  notification_intents: { finishedAt: "expanded_at", error: "error" },
  notification_deliveries: { finishedAt: "sent_at" },
  whatsapp_inbound_events: { finishedAt: "processed_at", error: "error" },
  outbound_whatsapp_messages: { finishedAt: "sent_at", error: "error_message" },
};

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const jobTableList = Object.keys(JOB_TABLE_CHANNELS) as JobTableName[];
export const jobTables = (): readonly JobTableName[] => jobTableList;

// Progress events use a browser channel. They do not wake a job queue.
export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";
