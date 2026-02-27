import { sql } from "kysely";
import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
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
