import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("extension_handoff_jtis")
    .addColumn("jti", "varchar(96)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("assignment_id", "integer", (col) =>
      col.notNull().references("lead_assignments.id"),
    )
    .addColumn("consumed_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("extension_sync_tokens")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("auth_session_id", "varchar(255)", (col) => col.notNull())
    .addColumn("token_hash", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("issued_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("revoked_at", "integer")
    .execute();

  await db.schema
    .createTable("extension_runtime_events")
    .addColumn("id", "varchar(96)", (col) => col.primaryKey())
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
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("source_event_id", "varchar(96)")
    .execute();

  await db.schema
    .createIndex("idx_extension_handoff_jtis_user_expires")
    .on("extension_handoff_jtis")
    .columns(["user_id", "expires_at"])
    .execute();

  await db.schema
    .createIndex("idx_extension_sync_tokens_user_expires")
    .on("extension_sync_tokens")
    .columns(["user_id", "expires_at"])
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
    .createIndex("idx_extension_executive_statuses_branch_status")
    .on("extension_executive_statuses")
    .columns(["branch_id", "status", "updated_at"])
    .execute();
}
