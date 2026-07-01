// Single source of truth for the queue-bearing tables. Each job table maps to
// the LISTEN/NOTIFY channel its producers ring on enqueue and its consumer
// listens on. The notify channel, `JobTableName`, and the table list (derived
// on demand by `jobTables()`) all flow from this one map, so adding a queue is
// a single entry rather than parallel lists.
export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  company_registry_record: "job:enrichment",
  notification_outbox: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;
export type JobChannel = (typeof JOB_TABLE_CHANNELS)[JobTableName];

// Every job table shares the canonical queue_state lifecycle, so a crashed
// worker's lease is reclaimed with one uniform reset. The list is derived
// from the registry; the cast is sound because the registry is a `const`
// literal so `Object.keys` cannot return anything outside the union.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const jobTableList = Object.keys(JOB_TABLE_CHANNELS) as JobTableName[];
export const jobTables = (): readonly JobTableName[] => jobTableList;

// Realtime record-import progress is not a job-wake: it streams ~200-400 byte
// progress events straight to the browser bridge, so it rides its own channel
// rather than a job table.
export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";
