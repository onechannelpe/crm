import { sql, type Kysely, type SqlBool } from "kysely";

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

  // A row means this user disabled this category on this channel. No row means
  // enabled.
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
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("provider", "text")
    .addColumn("provider_message_id", "text")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
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

  // Covers pending deliveries and lets claims filter by available_at.
  await db.schema
    .createIndex("idx_notification_deliveries_claim")
    .on("notification_deliveries")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

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
    // The caller supplies id as a deterministic idempotency key. Text preserves it
    // when the intent is expanded again.
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
    // sequence stores Kapso's ordering value. Quarantined rows have no sequence,
    // but pending rows need one for the conversation-ordered claim.
    .addColumn("sequence", "bigint")
    .addColumn("provider_timestamp", "timestamptz", (col) => col.notNull())
    .addColumn("payload_json", "jsonb", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("outcome", "text")
    .addColumn("error", "text")
    .addColumn("received_at", "timestamptz", (col) => col.notNull())
    .addColumn("processed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_whatsapp_inbound_events_claim")
    .on("whatsapp_inbound_events")
    .columns(["available_at", "sequence"])
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  await db.schema
    .createIndex("idx_whatsapp_inbound_events_stale")
    .on("whatsapp_inbound_events")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();

  // The inbound claim checks this index for an earlier pending or processing event
  // in the same conversation.
  await db.schema
    .createIndex("idx_whatsapp_inbound_events_ordering")
    .on("whatsapp_inbound_events")
    .columns(["conversation_id", "sequence"])
    .where(sql<SqlBool>`queue_state IN ('pending', 'processing')`)
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
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("provider", "text")
    .addColumn("provider_message_id", "text")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("sent_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_outbound_whatsapp_messages_claim")
    .on("outbound_whatsapp_messages")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  await db.schema
    .createIndex("idx_outbound_whatsapp_messages_stale")
    .on("outbound_whatsapp_messages")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();
}
