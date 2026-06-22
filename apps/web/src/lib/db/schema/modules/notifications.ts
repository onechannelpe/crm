import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_channel_addresses")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("address", "varchar(255)", (col) => col.notNull())
    .addColumn("is_verified", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("verified_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_user_channel_addresses_user_channel")
    .on("user_channel_addresses")
    .columns(["user_id", "channel"])
    .unique()
    .execute();

  await db.schema
    .createIndex("idx_user_channel_addresses_channel_address")
    .on("user_channel_addresses")
    .columns(["channel", "address"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_preferences")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
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
    .createTable("notification_deliveries")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("intent_id", "text", (col) => col.notNull())
    .addColumn("recipient_channel", "varchar(20)", (col) => col.notNull())
    .addColumn("recipient_address", "varchar(255)", (col) => col.notNull())
    .addColumn("provider", "varchar(32)", (col) => col.notNull())
    .addColumn("provider_message_id", "varchar(255)")
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("error_code", "varchar(64)")
    .addColumn("error_message", "text")
    .addColumn("latency_ms", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_deliveries_intent_created")
    .on("notification_deliveries")
    .columns(["intent_id", "created_at"])
    .execute();

  await db.schema
    .createTable("app_notifications")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("source_event_id", "text", (col) => col.notNull())
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("priority", "varchar(16)", (col) => col.notNull())
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "varchar(255)")
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
    .createIndex("idx_app_notifications_source_event")
    .on("app_notifications")
    .columns(["user_id", "source_event_id"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_outbox")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("audience_json", "text", (col) => col.notNull())
    .addColumn("channels_json", "text", (col) => col.notNull())
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "varchar(255)")
    .addColumn("priority", "varchar(16)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("lease_owner", "varchar(100)")
    .addColumn("lease_until", "integer")
    .addColumn("error", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_notification_outbox_status")
    .on("notification_outbox")
    .columns(["status", "available_at", "lease_until"])
    .execute();

  await db.schema
    .createTable("whatsapp_sessions")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().unique().references("users.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();
}
