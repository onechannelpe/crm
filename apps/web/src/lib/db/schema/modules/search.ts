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

  // The scrape queue claims a row (queue_state/lease/attempts), fills the
  // result columns, and stamps source/fetched_at/expires_at. Freshness and the
  // UI lifecycle are derived from (queue_state, source, expires_at): there is
  // no separate status mirror. `source` is null until the first authoritative
  // or fallback fill; 'sunat' is authoritative, 'engine' is the degraded
  // fallback written only when SUNAT was unreachable.
  await db.schema
    .createTable("company_registry_record")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
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
    .addColumn("payload_json", "jsonb")
    .addColumn("source", "text")
    .addColumn("fetched_at", "timestamptz")
    .addColumn("expires_at", "timestamptz")
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("lease_owner", "text")
    .addColumn("lease_until", "timestamptz")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_error", "text")
    // Nullable: a system-initiated reaction has no requesting user.
    .addColumn("requested_by_user_id", "uuid", (col) =>
      col.references("users.id"),
    )
    .addColumn("requested_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_company_registry_record_document")
    .on("company_registry_record")
    .columns(["document_type", "document_value"])
    .unique()
    .execute();

  // Claim path: only pending rows that are due.
  await db.schema
    .createIndex("idx_company_registry_record_claim")
    .on("company_registry_record")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  // Stale-scan path: leased rows whose lease has expired.
  await db.schema
    .createIndex("idx_company_registry_record_stale")
    .on("company_registry_record")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();
}
