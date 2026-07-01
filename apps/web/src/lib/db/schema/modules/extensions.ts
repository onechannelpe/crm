import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("extension_handoffs")
    .addColumn("jti", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("auth_session_id", "text", (col) => col.notNull())
    .addColumn("assignment_id", "uuid", (col) =>
      col.notNull().references("contact_assignments.id"),
    )
    .addColumn("origin", "text", (col) => col.notNull())
    .addColumn("installation_id", "text")
    .addColumn("installation_session_jti", "text")
    .addColumn("issued_at", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("consumed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_extension_handoffs_user_expires")
    .on("extension_handoffs")
    .columns(["user_id", "expires_at"])
    .execute();

  await db.schema
    .createTable("extension_installation_sessions")
    .addColumn("jti", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("auth_session_id", "text", (col) => col.notNull())
    .addColumn("installation_id", "text", (col) => col.notNull())
    .addColumn("refresh_token_hash", "text", (col) => col.notNull().unique())
    .addColumn("issued_at", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("revoked_at", "timestamptz")
    .addColumn("last_seen_at", "timestamptz")
    .addColumn("refreshed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_extension_installation_sessions_user_expires")
    .on("extension_installation_sessions")
    .columns(["user_id", "expires_at"])
    .execute();

  await db.schema
    .createTable("extension_runtime_events")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("sequence", "integer", (col) => col.notNull())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("assignment_id", "uuid", (col) =>
      col.references("contact_assignments.id"),
    )
    .addColumn("contact_id", "uuid", (col) =>
      col.references("organization_people.id"),
    )
    .addColumn("call_session_id", "text")
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("payload_json", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("received_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_extension_runtime_events_user_received")
    .on("extension_runtime_events")
    .columns(["user_id", "received_at"])
    .execute();

  await db.schema
    .createIndex("idx_extension_runtime_events_assignment_created")
    .on("extension_runtime_events")
    .columns(["assignment_id", "created_at"])
    .execute();

  await db.schema
    .createTable("extension_executive_statuses")
    .addColumn("user_id", "uuid", (col) =>
      col.primaryKey().references("users.id"),
    )
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("assignment_id", "uuid", (col) =>
      col.references("contact_assignments.id"),
    )
    .addColumn("contact_id", "uuid", (col) =>
      col.references("organization_people.id"),
    )
    .addColumn("call_session_id", "text")
    .addColumn("presence_status", "text")
    .addColumn("presence_updated_at", "timestamptz")
    .addColumn("sync_health", "text", (col) => col.notNull())
    .addColumn("sync_updated_at", "timestamptz")
    .addColumn("source_event_id", "text")
    .addColumn("source_event_sequence", "integer")
    .execute();

  await db.schema
    .createIndex("idx_extension_executive_statuses_branch_status")
    .on("extension_executive_statuses")
    .columns(["branch_id", "presence_status", "presence_updated_at"])
    .execute();
}
