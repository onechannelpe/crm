import { sql, type SqlBool } from "kysely";

export const JOB_TABLE_CHANNELS = {
  workflow_integration_jobs: "job:records-import",
  gpv_snapshot_jobs: "job:gpv-snapshots",
  company_registry_record: "job:enrichment",
  notification_intents: "job:notifications-intents",
  notification_deliveries: "job:notifications-deliveries",
  whatsapp_inbound_events: "job:whatsapp-inbound-events",
  outbound_whatsapp_messages: "job:outbound-whatsapp-messages",
} as const;

export type JobTableName = keyof typeof JOB_TABLE_CHANNELS;

// Postgres does not allow parameters in index predicates.
export const CLAIMABLE_STATES = sql<SqlBool>`queue_state in ('pending', 'processing')`;
