import type { LifecycleColumns } from "./job-store";

// The notify channel, `JobTableName`, and the table list (derived on demand
// by `jobTables()`) all flow from this one map, so adding a queue is a single
// entry rather than parallel lists.
export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  company_registry_record: "job:enrichment",
  notification_intents: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;
export type JobChannel = (typeof JOB_TABLE_CHANNELS)[JobTableName];

// `createJobStore` reads its table's entry here instead of taking `lifecycle`
// as a per-call argument, and the stale-scanner reads the same entry to
// correct the mirror when it resets a crashed lease. A table's status column
// can therefore never disagree with `queue_state` for longer than it takes
// the scanner to run.
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
};

// The cast is sound because the registry is a `const` literal so
// `Object.keys` cannot return anything outside the union.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const jobTableList = Object.keys(JOB_TABLE_CHANNELS) as JobTableName[];
export const jobTables = (): readonly JobTableName[] => jobTableList;

// Realtime record-import progress is not a job-wake: it streams progress
// events straight to the browser bridge, so it rides its own channel rather
// than a job table.
export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";
