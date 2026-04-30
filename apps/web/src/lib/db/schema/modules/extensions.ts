import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("extension_handoffs")
    .addColumn("jti", "varchar(96)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("auth_session_id", "varchar(255)", (col) => col.notNull())
    .addColumn("assignment_id", "integer", (col) =>
      col.notNull().references("lead_assignments.id"),
    )
    .addColumn("origin", "varchar(255)", (col) => col.notNull())
    .addColumn("installation_id", "varchar(36)")
    .addColumn("installation_session_jti", "varchar(96)")
    .addColumn("issued_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("consumed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_extension_handoffs_user_expires")
    .on("extension_handoffs")
    .columns(["user_id", "expires_at"])
    .execute();

  await db.schema
    .createTable("extension_installation_sessions")
    .addColumn("jti", "varchar(96)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("auth_session_id", "varchar(255)", (col) => col.notNull())
    .addColumn("installation_id", "varchar(36)", (col) => col.notNull())
    .addColumn("refresh_token_hash", "varchar(255)", (col) =>
      col.notNull().unique(),
    )
    .addColumn("issued_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("revoked_at", "integer")
    .addColumn("last_seen_at", "integer")
    .addColumn("refreshed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_extension_installation_sessions_user_expires")
    .on("extension_installation_sessions")
    .columns(["user_id", "expires_at"])
    .execute();

  await db.schema
    .createTable("extension_runtime_events")
    .addColumn("id", "varchar(96)", (col) => col.primaryKey())
    .addColumn("sequence", "integer", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("assignment_id", "integer", (col) =>
      col.references("lead_assignments.id"),
    )
    .addColumn("contact_id", "integer", (col) => col.references("contacts.id"))
    .addColumn("call_session_id", "varchar(255)")
    .addColumn("type", "varchar(32)", (col) => col.notNull())
    .addColumn("payload_json", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("received_at", "integer", (col) => col.notNull())
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
    .addColumn("user_id", "integer", (col) =>
      col.primaryKey().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("assignment_id", "integer", (col) =>
      col.references("lead_assignments.id"),
    )
    .addColumn("contact_id", "integer", (col) => col.references("contacts.id"))
    .addColumn("call_session_id", "varchar(255)")
    .addColumn("presence_status", "varchar(20)")
    .addColumn("presence_updated_at", "integer")
    .addColumn("sync_health", "varchar(20)", (col) => col.notNull())
    .addColumn("sync_updated_at", "integer")
    .addColumn("source_event_id", "varchar(96)")
    .addColumn("source_event_sequence", "integer")
    .execute();

  await db.schema
    .createIndex("idx_extension_executive_statuses_branch_status")
    .on("extension_executive_statuses")
    .columns(["branch_id", "presence_status", "presence_updated_at"])
    .execute();
}
