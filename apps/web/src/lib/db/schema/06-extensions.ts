import { sql } from "kysely";
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

  await db.schema
    .createTable("search_enrichment_jobs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("document_type", "varchar(8)", (col) => col.notNull())
    .addColumn("document_value", "varchar(32)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("requested_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("requested_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .addColumn("lease_owner", "varchar(64)")
    .addColumn("lease_until", "integer")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("last_error", "text")
    .execute();

  await db.schema
    .createTable("search_enrichment_overlays")
    .addColumn("document_type", "varchar(8)", (col) => col.notNull())
    .addColumn("document_value", "varchar(32)", (col) => col.notNull())
    .addColumn("full_name", "varchar(255)")
    .addColumn("legal_name", "varchar(255)")
    .addColumn("source", "varchar(32)", (col) =>
      col.notNull().defaultTo("sunat"),
    )
    .addColumn("confidence", "integer", (col) => col.notNull())
    .addColumn("fetched_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("payload_json", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_search_enrichment_overlays", [
      "document_type",
      "document_value",
    ])
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_jobs_status_lease_time")
    .on("search_enrichment_jobs")
    .columns(["status", "lease_until", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_jobs_doc_time")
    .on("search_enrichment_jobs")
    .columns(["document_type", "document_value", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_overlays_expires")
    .on("search_enrichment_overlays")
    .columns(["expires_at"])
    .execute();

  await sql`
    CREATE UNIQUE INDEX idx_search_enrichment_jobs_document_unique
    ON search_enrichment_jobs (document_type, document_value)
  `.execute(db);
}
