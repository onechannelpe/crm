import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_channel_addresses")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("channel", "text", (col) => col.notNull())
    .addColumn("address", "text", (col) => col.notNull())
    .addColumn("is_verified", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("verified_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
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
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("channel", "text", (col) => col.notNull())
    .addColumn("is_enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_prefs_user_event_channel")
    .on("notification_preferences")
    .columns(["user_id", "event_type", "channel"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_deliveries")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("intent_id", "text", (col) => col.notNull())
    .addColumn("user_id", "uuid", (col) => col.notNull())
    .addColumn("channel", "text", (col) => col.notNull())
    .addColumn("recipient_address", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "text")
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("provider", "text")
    .addColumn("provider_message_id", "text")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("latency_ms", "integer")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("sent_at", "timestamptz")
    .execute();

  // Idempotency: re-expanding an intent never creates a second delivery for the
  // same recipient and channel.
  await db.schema
    .createIndex("idx_notification_deliveries_recipient")
    .on("notification_deliveries")
    .columns(["intent_id", "user_id", "channel"])
    .unique()
    .execute();

  // Claim path: only pending rows that are due. Partial index keeps it to the
  // live working set.
  await db.schema
    .createIndex("idx_notification_deliveries_claim")
    .on("notification_deliveries")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  // Stale-scan path: leased rows whose lease has expired.
  await db.schema
    .createIndex("idx_notification_deliveries_stale")
    .on("notification_deliveries")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();

  await db.schema
    .createTable("app_notifications")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("source_event_id", "text", (col) => col.notNull())
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("priority", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "text")
    .addColumn("metadata_json", "jsonb")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("read_at", "timestamptz")
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
    .createTable("notification_intents")
    // `id` is a caller-supplied deterministic idempotency key
    // (`${eventId}:${stage}`, see reactors/notify.ts and
    // reactors/fulfillment-notify.ts), not a generated row id; `text` lets
    // re-expansion collide on the same row.
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("audience_json", "jsonb", (col) => col.notNull())
    .addColumn("channels_json", "jsonb", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("action_url", "text")
    .addColumn("priority", "text", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("error", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("expanded_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_notification_intents_claim")
    .on("notification_intents")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  await db.schema
    .createIndex("idx_notification_intents_stale")
    .on("notification_intents")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();

  await db.schema
    .createTable("whatsapp_sessions")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().unique().references("users.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();
}
