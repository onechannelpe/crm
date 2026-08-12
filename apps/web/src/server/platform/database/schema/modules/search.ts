import { sql } from "kysely";
import type { Kysely } from "kysely";

import { CLAIMABLE_STATES } from "~/server/platform/jobs/registry";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
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
    // Null before the first result. SUNAT is authoritative; engine is fallback.
    .addColumn("source", "text")
    .addColumn("fetched_at", "timestamptz")
    .addColumn("expires_at", "timestamptz")
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("lease_owner", "text")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .addColumn("error_message", "text")
    // System-created requests have no requesting user.
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

  await db.schema
    .createIndex("idx_company_registry_record_claim")
    .on("company_registry_record")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();
}
