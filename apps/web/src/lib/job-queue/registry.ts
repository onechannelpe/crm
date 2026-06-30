// Single source of truth for the queue-bearing tables. Each job table maps to
// the LISTEN/NOTIFY channel its producers ring on enqueue and its consumer
// listens on. `JobTableName`, the stale-scanner's table list, and the notify
// channels are all derived from this one map, so adding a queue is a single
// entry rather than three parallel lists.
export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  search_enrichment_jobs: "job:enrichment",
  search_enrichment_completion_outbox: "job:enrichment-writeback",
  notification_outbox: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;
export type JobChannel = (typeof JOB_TABLE_CHANNELS)[JobTableName];

export const JOB_TABLES = Object.keys(JOB_TABLE_CHANNELS) as JobTableName[];

// Realtime record-import progress is not a job-wake: it streams ~200-400 byte
// progress events straight to the browser bridge, so it rides its own channel
// rather than a job table.
export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";
