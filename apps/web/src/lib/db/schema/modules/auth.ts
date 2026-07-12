import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // Authentication & sessions
  await db.schema
    .createTable("user_sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("session_class", "text", (col) => col.notNull())
    .addColumn("primary_auth_method", "text", (col) => col.notNull())
    .addColumn("strong_auth_method", "text")
    .addColumn("impersonator_user_id", "uuid", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("strong_auth_at", "timestamptz")
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_activity", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
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
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_activity", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_request_sessions_expires_at")
    .on("request_sessions")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("auth_throttle_counters")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("scope", "text", (col) => col.notNull())
    .addColumn("key_hash", "text", (col) => col.notNull())
    .addColumn("window_started_at", "timestamptz", (col) => col.notNull())
    .addColumn("failure_count", "integer", (col) => col.notNull())
    .addColumn("blocked_until", "timestamptz")
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
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
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("method", "text", (col) => col.notNull())
    .addColumn("stage", "text", (col) => col.notNull())
    .addColumn("outcome", "text", (col) => col.notNull())
    .addColumn("reason", "text")
    .addColumn("identifier_hash", "text", (col) => col.notNull())
    .addColumn("ip_hash", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
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
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("public_key", "text", (col) => col.notNull())
    .addColumn("counter", "integer", (col) => col.notNull())
    .addColumn("transports", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_used_at", "timestamptz")
    .execute();

  await db.schema
    .createTable("webauthn_challenges")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("challenge", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  // TOTP multi-factor
  await db.schema
    .createTable("user_totp_factors")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("secret_encrypted", "text", (col) => col.notNull())
    .addColumn("is_enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("enabled_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_totp_factors_user_id")
    .on("user_totp_factors")
    .column("user_id")
    .unique()
    .execute();

  await db.schema
    .createTable("user_totp_recovery_codes")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("code_hash", "text", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_totp_recovery_user_used")
    .on("user_totp_recovery_codes")
    .columns(["user_id", "used_at"])
    .execute();

  // OAuth
  await db.schema
    .createTable("user_oauth_accounts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("provider", "text", (col) => col.notNull())
    .addColumn("provider_user_id", "text", (col) => col.notNull())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
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
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("identifier", "text", (col) => col.notNull())
    .addColumn("primary_auth_method", "text", (col) => col.notNull())
    .addColumn("user_id", "uuid", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("challenge_id", "uuid", (col) =>
      col.references("webauthn_challenges.id").onDelete("cascade"),
    )
    .addColumn("state", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_login_flows_expires_at")
    .on("login_flows")
    .column("expires_at")
    .execute();

  // Password reset tokens
  await db.schema
    .createTable("password_reset_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_password_reset_tokens_user_expires")
    .on("password_reset_tokens")
    .columns(["user_id", "expires_at"])
    .execute();
}
