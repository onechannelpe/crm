import { sql, type SqlBool } from "kysely";

export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  merchant_report_imports: "job:merchant-report-imports",
  merchant_attribution_jobs: "job:merchant-attribution",
  company_registry_record: "job:enrichment",
  notification_intents: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
  whatsapp_inbound_events: "job:whatsapp-inbound-events",
  outbound_whatsapp_messages: "job:outbound-whatsapp-messages",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;
export type JobChannel = (typeof JOB_TABLE_CHANNELS)[JobTableName];

// Postgres does not allow parameters in index predicates.
export const CLAIMABLE_STATES = sql<SqlBool>`queue_state in ('pending', 'processing')`;

// Progress updates use a browser channel, not a job queue.
export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";
export const MERCHANT_REPORT_PROGRESS_CHANNEL = "merchant-report-progress";
