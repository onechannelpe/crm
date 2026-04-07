import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("team_id", "integer", (col) => col.references("teams.id"))
    .addColumn("username", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("names", "varchar(255)", (col) => col.notNull())
    .addColumn("first_surname", "varchar(255)", (col) => col.notNull())
    .addColumn("second_surname", "varchar(255)", (col) => col.notNull())
    .addColumn("phone_e164", "varchar(20)")
    .addColumn("avatar_storage_key", "varchar(255)")
    .addColumn("avatar_mime_type", "varchar(64)")
    .addColumn("avatar_updated_at", "integer")
    .addColumn("avatar_version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("onboarding_completed_at", "integer")
    .addColumn("role", "varchar(50)", (col) => col.notNull())
    .addColumn("executive_category", "varchar(20)")
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("expires_at", "integer")
    .addColumn("expiry_notified_at", "integer")
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

  // Authentication & sessions
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
    .addColumn("session_class", "varchar(32)", (col) => col.notNull())
    .addColumn("primary_auth_method", "varchar(32)", (col) => col.notNull())
    .addColumn("strong_auth_method", "varchar(32)")
    .addColumn("strong_auth_at", "integer")
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("last_activity", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_user_sessions_user_activity")
    .on("user_sessions")
    .columns(["user_id", "last_activity"])
    .execute();

  await db.schema
    .createIndex("idx_user_sessions_expires_at")
    .on("user_sessions")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("request_sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("csrf_token", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("last_activity", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_request_sessions_expires_at")
    .on("request_sessions")
    .column("expires_at")
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

  // WebAuthn passkeys
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

  // TOTP multi-factor
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
    .createIndex("idx_totp_factors_user_id")
    .on("user_totp_factors")
    .column("user_id")
    .unique()
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
    .createIndex("idx_totp_recovery_user_used")
    .on("user_totp_recovery_codes")
    .columns(["user_id", "used_at"])
    .execute();

  // OAuth
  await db.schema
    .createTable("user_oauth_accounts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("provider", "varchar(32)", (col) => col.notNull())
    .addColumn("provider_user_id", "varchar(255)", (col) => col.notNull())
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("uq_user_oauth_accounts_provider_user")
    .unique()
    .on("user_oauth_accounts")
    .columns(["provider", "provider_user_id"])
    .execute();

  // Login flows
  await db.schema
    .createTable("login_flows")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("identifier", "varchar(255)", (col) => col.notNull())
    .addColumn("primary_auth_method", "varchar(32)", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("challenge_id", "integer", (col) =>
      col.references("webauthn_challenges.id").onDelete("cascade"),
    )
    .addColumn("state", "varchar(32)", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_login_flows_expires_at")
    .on("login_flows")
    .column("expires_at")
    .execute();

  // Password reset tokens
  await db.schema
    .createTable("password_reset_tokens")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("used_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_password_reset_tokens_user_expires")
    .on("password_reset_tokens")
    .columns(["user_id", "expires_at"])
    .execute();
}
