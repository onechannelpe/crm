import { sql } from "kysely";
import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("client_search_views")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("search_type", "text", (col) => col.notNull())
    .addColumn("query_value", "text", (col) => col.notNull())
    .addColumn("limit_value", "integer", (col) => col.notNull().defaultTo(20))
    .addColumn("is_default", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_client_search_views_user_created")
    .on("client_search_views")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_client_search_views_user_name")
    .on("client_search_views")
    .columns(["user_id", "name"])
    .unique()
    .execute();

  await db.schema
    .createTable("search_enrichment_jobs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("document_type", "text", (col) => col.notNull())
    .addColumn("document_value", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("requested_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("requested_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_error", "text")
    .execute();

  // Claim path: only pending rows that are due.
  await db.schema
    .createIndex("idx_search_enrichment_jobs_claim")
    .on("search_enrichment_jobs")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  // Stale-scan path: leased rows whose lease has expired.
  await db.schema
    .createIndex("idx_search_enrichment_jobs_stale")
    .on("search_enrichment_jobs")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_jobs_doc_time")
    .on("search_enrichment_jobs")
    .columns(["document_type", "document_value", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_jobs_document_unique")
    .on("search_enrichment_jobs")
    .columns(["document_type", "document_value"])
    .unique()
    .execute();

  await db.schema
    .createTable("search_enrichment_overlays")
    .addColumn("document_type", "text", (col) => col.notNull())
    .addColumn("document_value", "text", (col) => col.notNull())
    .addColumn("full_name", "text")
    .addColumn("legal_name", "text")
    .addColumn("address", "text")
    .addColumn("district", "text")
    .addColumn("department", "text")
    .addColumn("contributor_status", "text")
    .addColumn("contributor_condition", "text")
    .addColumn("economic_activities_json", "jsonb")
    .addColumn("source", "text", (col) => col.notNull().defaultTo("sunat"))
    .addColumn("fetched_at", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("payload_json", "jsonb", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_search_enrichment_overlays", [
      "document_type",
      "document_value",
    ])
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_overlays_expires")
    .on("search_enrichment_overlays")
    .columns(["expires_at"])
    .execute();

  await db.schema
    .createTable("search_enrichment_completion_outbox")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("document_type", "text", (col) => col.notNull())
    .addColumn("document_value", "text", (col) => col.notNull())
    .addColumn("legal_name", "text")
    .addColumn("address", "text")
    .addColumn("district", "text")
    .addColumn("department", "text")
    .addColumn("fetched_at", "timestamptz", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("processed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_completion_outbox_claim")
    .on("search_enrichment_completion_outbox")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_completion_outbox_stale")
    .on("search_enrichment_completion_outbox")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();

  await db.schema
    .createIndex("idx_search_enrichment_completion_outbox_active_doc")
    .unique()
    .on("search_enrichment_completion_outbox")
    .columns(["document_type", "document_value"])
    .where(sql.ref("queue_state"), "in", ["pending", "processing"])
    .execute();
}
