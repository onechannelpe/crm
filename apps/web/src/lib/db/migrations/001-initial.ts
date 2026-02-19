import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  const now = Date.now();

  await db.schema
    .createTable("branches")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("users")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("team_id", "integer", (col) => col.references("teams.id"))
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("full_name", "varchar(255)", (col) => col.notNull())
    .addColumn("phone_e164", "varchar(20)")
    .addColumn("phone_verified_at", "integer")
    .addColumn("profile_confirmed_at", "integer")
    .addColumn("onboarding_completed_at", "integer")
    .addColumn("strong_auth_required", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("strong_auth_enrolled_at", "integer")
    .addColumn("role", "varchar(50)", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("notification_contacts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
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
    .createTable("notification_campaigns")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("type", "varchar(32)", (col) => col.notNull())
    .addColumn("event_type", "varchar(64)", (col) => col.notNull())
    .addColumn("audience_type", "varchar(20)", (col) => col.notNull())
    .addColumn("audience_ref", "varchar(64)")
    .addColumn("title", "varchar(255)")
    .addColumn("body_text", "text", (col) => col.notNull())
    .addColumn("created_by_user_id", "integer", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("scheduled_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createTable("notification_recipients")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("campaign_id", "integer", (col) =>
      col.notNull().references("notification_campaigns.id").onDelete("cascade"),
    )
    .addColumn("user_id", "integer", (col) =>
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
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("lease_until", "integer")
    .addColumn("last_error", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
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
    .createTable("app_notifications")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
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

  await db.schema
    .createTable("teams")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("supervisor_id", "integer", (col) => col.references("users.id"))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("organizations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("locked_branch_id", "integer", (col) =>
      col.references("branches.id"),
    )
    .addColumn("locked_at", "integer")
    .addColumn("locked_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("contacts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("organization_id", "integer", (col) =>
      col.notNull().references("organizations.id"),
    )
    .addColumn("dni", "varchar(20)", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("phone_primary", "varchar(20)")
    .addColumn("phone_secondary", "varchar(20)")
    .addColumn("last_contacted_at", "integer")
    .addColumn("last_contacted_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("cooldown_until", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("lead_assignments")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("contact_id", "integer", (col) =>
      col.notNull().references("contacts.id"),
    )
    .addColumn("assigned_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("quota_allocations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("allocated_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("date", "varchar(10)", (col) => col.notNull())
    .addColumn("quota_amount", "integer", (col) => col.notNull())
    .addColumn("used_amount", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("products")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("category", "varchar(50)", (col) => col.notNull())
    .addColumn("subtype", "varchar(50)")
    .addColumn("price", "real", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable("charge_notes")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("contact_id", "integer", (col) =>
      col.notNull().references("contacts.id"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .addColumn("exec_code_real", "varchar(255)")
    .addColumn("exec_code_tdp", "varchar(255)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("charge_note_items")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("product_id", "integer", (col) =>
      col.notNull().references("products.id"),
    )
    .addColumn("quantity", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("rejection_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("reviewer_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("field_id", "varchar(255)", (col) => col.notNull())
    .addColumn("reviewer_note", "text")
    .addColumn("is_resolved", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("interaction_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("contact_id", "integer", (col) =>
      col.notNull().references("contacts.id"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("outcome", "varchar(255)", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("inventory_items")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("product_id", "integer", (col) =>
      col.notNull().references("products.id"),
    )
    .addColumn("serial_number", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("inventory_locks")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("inventory_item_id", "integer", (col) =>
      col.notNull().references("inventory_items.id"),
    )
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("locked_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("sales_documents")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("original_name", "varchar(255)", (col) => col.notNull())
    .addColumn("mime_type", "varchar(100)", (col) => col.notNull())
    .addColumn("size_bytes", "integer", (col) => col.notNull())
    .addColumn("sha256", "varchar(64)", (col) => col.notNull())
    .addColumn("storage_key", "varchar(255)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("created_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("deleted_at", "integer")
    .execute();

  await db.schema
    .createTable("sales_document_events")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("document_id", "integer", (col) =>
      col.notNull().references("sales_documents.id").onDelete("cascade"),
    )
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("actor_user_id", "integer", (col) => col.references("users.id"))
    .addColumn("event_type", "varchar(40)", (col) => col.notNull())
    .addColumn("details", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("sales_document_policies")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("max_file_size_bytes", "integer", (col) => col.notNull())
    .addColumn("allowed_mime_types_json", "text", (col) => col.notNull())
    .addColumn("retention_days", "integer", (col) => col.notNull())
    .addColumn("hard_delete_enabled", "integer", (col) =>
      col.notNull().defaultTo(1),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await sql`
    INSERT INTO sales_document_policies (
      scope,
      max_file_size_bytes,
      allowed_mime_types_json,
      retention_days,
      hard_delete_enabled,
      created_at,
      updated_at
    ) VALUES (
      'global',
      ${20 * 1024 * 1024},
      '["image/jpeg","image/png","image/webp","application/pdf"]',
      90,
      1,
      ${now},
      ${now}
    )
  `.execute(db);

  await db.schema
    .createTable("agent_status_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("latitude", "real", (col) => col.notNull())
    .addColumn("longitude", "real", (col) => col.notNull())
    .addColumn("comment", "text")
    .addColumn("started_at", "integer", (col) => col.notNull())
    .addColumn("ended_at", "integer")
    .execute();

  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("action", "varchar(255)", (col) => col.notNull())
    .addColumn("entity_type", "varchar(100)", (col) => col.notNull())
    .addColumn("entity_id", "integer", (col) => col.notNull())
    .addColumn("changes", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("audit_action_policies")
    .addColumn("action", "varchar(120)", (col) => col.primaryKey())
    .addColumn("risk_level", "varchar(10)", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("is_protected", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("updated_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await sql`
    INSERT INTO audit_action_policies (
      action,
      risk_level,
      is_active,
      is_protected,
      updated_by_user_id,
      created_at,
      updated_at
    ) VALUES
      ('all_sessions_revoked', 'high', 1, 1, NULL, ${now}, ${now}),
      ('session_revoked_by_admin', 'high', 1, 1, NULL, ${now}, ${now}),
      ('product_updated', 'high', 1, 1, NULL, ${now}, ${now}),
      ('charge_note_approved', 'high', 1, 1, NULL, ${now}, ${now}),
      ('charge_note_rejected', 'high', 1, 1, NULL, ${now}, ${now}),
      ('quota_allocated', 'high', 1, 1, NULL, ${now}, ${now})
  `.execute(db);

  await db.schema
    .createTable("passkeys")
    .addColumn("id", "varchar(512)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("public_key", "text", (col) => col.notNull())
    .addColumn("counter", "integer", (col) => col.notNull())
    .addColumn("transports", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("last_used_at", "integer")
    .execute();

  await db.schema
    .createTable("webauthn_challenges")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) => col.references("users.id"))
    .addColumn("type", "varchar(32)", (col) => col.notNull())
    .addColumn("challenge", "varchar(512)", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("user_sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("auth_method", "varchar(32)", (col) => col.notNull())
    .addColumn("strong_auth_at", "integer")
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("last_activity", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("auth_throttle_counters")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope", "varchar(20)", (col) => col.notNull())
    .addColumn("key_hash", "varchar(64)", (col) => col.notNull())
    .addColumn("window_started_at", "integer", (col) => col.notNull())
    .addColumn("failure_count", "integer", (col) => col.notNull())
    .addColumn("blocked_until", "integer")
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("auth_events")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("method", "varchar(20)", (col) => col.notNull())
    .addColumn("stage", "varchar(20)", (col) => col.notNull())
    .addColumn("outcome", "varchar(20)", (col) => col.notNull())
    .addColumn("reason", "varchar(64)")
    .addColumn("identifier_hash", "varchar(64)", (col) => col.notNull())
    .addColumn("ip_hash", "varchar(64)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("user_totp_factors")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("secret_encrypted", "text", (col) => col.notNull())
    .addColumn("is_enabled", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("enabled_at", "integer")
    .execute();

  await db.schema
    .createTable("user_totp_recovery_codes")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("code_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("used_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_users_email")
    .on("users")
    .column("email")
    .execute();
  await db.schema
    .createIndex("idx_users_onboarding")
    .on("users")
    .column("onboarding_completed_at")
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
    .createIndex("idx_notification_prefs_user_event_channel")
    .on("notification_preferences")
    .columns(["user_id", "event_type", "channel"])
    .unique()
    .execute();
  await db.schema
    .createIndex("idx_notification_campaigns_status_scheduled")
    .on("notification_campaigns")
    .columns(["status", "scheduled_at"])
    .execute();
  await db.schema
    .createIndex("idx_notification_recipients_campaign_status")
    .on("notification_recipients")
    .columns(["campaign_id", "status"])
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
    .createIndex("idx_notification_deliveries_recipient_created")
    .on("notification_deliveries")
    .columns(["recipient_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_organizations_ruc")
    .on("organizations")
    .column("ruc")
    .execute();
  await db.schema
    .createIndex("idx_contacts_dni")
    .on("contacts")
    .column("dni")
    .execute();
  await db.schema
    .createIndex("idx_lead_assignments_user")
    .on("lead_assignments")
    .columns(["user_id", "status"])
    .execute();
  await db.schema
    .createIndex("idx_quota_user_date")
    .on("quota_allocations")
    .columns(["user_id", "date"])
    .execute();
  await db.schema
    .createIndex("idx_charge_notes_user")
    .on("charge_notes")
    .columns(["user_id", "status"])
    .execute();
  await db.schema
    .createIndex("idx_sales_documents_charge_status_created")
    .on("sales_documents")
    .columns(["charge_note_id", "status", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_sales_documents_status_deleted_at")
    .on("sales_documents")
    .columns(["status", "deleted_at"])
    .execute();
  await db.schema
    .createIndex("idx_sales_documents_sha256")
    .on("sales_documents")
    .column("sha256")
    .execute();
  await db.schema
    .createIndex("idx_sales_document_events_document_created")
    .on("sales_document_events")
    .columns(["document_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_sales_document_events_charge_created")
    .on("sales_document_events")
    .columns(["charge_note_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_audit_created_at")
    .on("audit_logs")
    .column("created_at")
    .execute();
  await db.schema
    .createIndex("idx_audit_action_created")
    .on("audit_logs")
    .columns(["action", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_audit_user_created")
    .on("audit_logs")
    .columns(["user_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_audit_entity_created")
    .on("audit_logs")
    .columns(["entity_type", "entity_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_audit_policy_risk_active")
    .on("audit_action_policies")
    .columns(["risk_level", "is_active"])
    .execute();
  await db.schema
    .createIndex("idx_user_sessions_user_id")
    .on("user_sessions")
    .column("user_id")
    .execute();
  await db.schema
    .createIndex("idx_user_sessions_expires_at")
    .on("user_sessions")
    .column("expires_at")
    .execute();
  await db.schema
    .createIndex("idx_auth_throttle_scope_key")
    .on("auth_throttle_counters")
    .columns(["scope", "key_hash"])
    .unique()
    .execute();
  await db.schema
    .createIndex("idx_auth_throttle_blocked_until")
    .on("auth_throttle_counters")
    .column("blocked_until")
    .execute();
  await db.schema
    .createIndex("idx_auth_throttle_updated_at")
    .on("auth_throttle_counters")
    .column("updated_at")
    .execute();
  await db.schema
    .createIndex("idx_auth_events_user_created")
    .on("auth_events")
    .columns(["user_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_auth_events_identifier_created")
    .on("auth_events")
    .columns(["identifier_hash", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_auth_events_outcome_created")
    .on("auth_events")
    .columns(["outcome", "created_at"])
    .execute();
  await db.schema
    .createIndex("idx_totp_factors_user_id")
    .on("user_totp_factors")
    .column("user_id")
    .unique()
    .execute();
  await db.schema
    .createIndex("idx_totp_recovery_user_used")
    .on("user_totp_recovery_codes")
    .columns(["user_id", "used_at"])
    .execute();
}
