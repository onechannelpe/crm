import { sql, type Kysely } from "kysely";

import { CLAIMABLE_STATES } from "~/server/platform/jobs/registry";

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
    .createTable("notification_opt_outs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("category", "text", (col) => col.notNull())
    .addColumn("channel", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_notification_opt_outs_user_category_channel")
    .on("notification_opt_outs")
    .columns(["user_id", "category", "channel"])
    .unique()
    .execute();

  await db.schema
    .createIndex("idx_notification_opt_outs_category_user")
    .on("notification_opt_outs")
    .columns(["category", "user_id"])
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
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("provider", "text")
    .addColumn("provider_message_id", "text")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_notification_deliveries_recipient")
    .on("notification_deliveries")
    .columns(["intent_id", "user_id", "channel"])
    .unique()
    .execute();

  await db.schema
    .createIndex("idx_notification_deliveries_claim")
    .on("notification_deliveries")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();

  await db.schema
    .createTable("app_notifications")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("intent_id", "text", (col) => col.notNull())
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
    .createIndex("idx_app_notifications_intent")
    .on("app_notifications")
    .columns(["user_id", "intent_id"])
    .unique()
    .execute();

  await db.schema
    .createTable("notification_intents")
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
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_notification_intents_claim")
    .on("notification_intents")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();

  await db.schema
    .createTable("whatsapp_sessions")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().unique().references("users.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("kapso_webhook_deliveries")
    .addColumn("idempotency_key", "text", (col) => col.primaryKey())
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("payload_version", "text", (col) => col.notNull())
    .addColumn("is_batch", "boolean", (col) => col.notNull())
    .addColumn("payload_json", "jsonb", (col) => col.notNull())
    .addColumn("received_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("whatsapp_inbound_events")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("delivery_key", "text", (col) =>
      col.notNull().references("kapso_webhook_deliveries.idempotency_key"),
    )
    .addColumn("conversation_id", "text", (col) => col.notNull())
    .addColumn("phone_number_id", "text", (col) => col.notNull())
    .addColumn("sender_address", "text", (col) => col.notNull())
    .addColumn("body", "text")
    .addColumn("provider_timestamp", "timestamptz", (col) => col.notNull())
    .addColumn("payload_json", "jsonb", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("outcome", "text")
    .addColumn("error_message", "text")
    .addColumn("received_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_whatsapp_inbound_events_claim")
    .on("whatsapp_inbound_events")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();

  await db.schema
    .createTable("outbound_whatsapp_messages")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("recipient_address", "text", (col) => col.notNull())
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("provider", "text")
    .addColumn("provider_message_id", "text")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_outbound_whatsapp_messages_claim")
    .on("outbound_whatsapp_messages")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();
}
