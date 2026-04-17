import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("notification_contacts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("address", "varchar(255)", (col) => col.notNull())
    .addColumn("is_primary", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("is_verified", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("verified_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_contacts_user_channel")
    .on("notification_contacts")
    .columns(["user_id", "channel"])
    .execute();

  await db.schema
    .createIndex("idx_notification_contacts_channel_address")
    .on("notification_contacts")
    .columns(["channel", "address"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_preferences")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("is_enabled", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_prefs_user_event_channel")
    .on("notification_preferences")
    .columns(["user_id", "event_type", "channel"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_campaigns")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("type", "varchar(32)", (col) => col.notNull())
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("audience_type", "varchar(20)", (col) => col.notNull())
    .addColumn("audience_ref", "varchar(64)")
    .addColumn("title", "varchar(255)")
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("created_by_user_id", "varchar(36)", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("scheduled_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_notification_campaigns_status_scheduled")
    .on("notification_campaigns")
    .columns(["status", "scheduled_at"])
    .execute();

  await db.schema
    .createTable("notification_recipients")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("campaign_id", "integer", (col) =>
      col.notNull().references("notification_campaigns.id").onDelete("cascade"),
    )
    .addColumn("user_id", "varchar(36)", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("address", "varchar(255)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("status_reason", "varchar(128)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("sent_at", "integer")
    .addColumn("failed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_notification_recipients_campaign_status")
    .on("notification_recipients")
    .columns(["campaign_id", "status"])
    .execute();

  await db.schema
    .createTable("notification_jobs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("recipient_id", "integer", (col) =>
      col
        .notNull()
        .references("notification_recipients.id")
        .onDelete("cascade"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("lease_owner", "varchar(64)")
    .addColumn("lease_until", "integer")
    .addColumn("last_error", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_jobs_status_available")
    .on("notification_jobs")
    .columns(["status", "available_at"])
    .execute();

  await db.schema
    .createIndex("idx_notification_jobs_lease_until")
    .on("notification_jobs")
    .column("lease_until")
    .execute();

  await db.schema
    .createIndex("idx_notification_jobs_recipient")
    .on("notification_jobs")
    .column("recipient_id")
    .unique()
    .execute();

  await db.schema
    .createTable("notification_deliveries")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("recipient_id", "integer", (col) =>
      col
        .notNull()
        .references("notification_recipients.id")
        .onDelete("cascade"),
    )
    .addColumn("provider", "varchar(32)", (col) => col.notNull())
    .addColumn("provider_message_id", "varchar(255)")
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("error_code", "varchar(64)")
    .addColumn("error_message", "text")
    .addColumn("latency_ms", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_deliveries_recipient_created")
    .on("notification_deliveries")
    .columns(["recipient_id", "created_at"])
    .execute();

  await db.schema
    .createTable("app_notifications")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("priority", "varchar(16)", (col) => col.notNull())
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "varchar(255)")
    .addColumn("dedupe_key", "varchar(255)")
    .addColumn("metadata_json", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("read_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_app_notifications_user_created")
    .on("app_notifications")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_app_notifications_dedupe")
    .on("app_notifications")
    .columns(["user_id", "dedupe_key"])
    .unique()
    .execute();
}
