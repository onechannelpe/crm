import { sql, type Kysely } from "kysely";

import { CLAIMABLE_STATES } from "~/lib/job-queue/registry";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_collection_mode_kinds")
    .addColumn("value", "text", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_currency_kinds")
    .addColumn("value", "text", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_account_type_kinds")
    .addColumn("value", "text", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_settlement_banks")
    .addColumn("value", "text", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_leads")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(sql`uuidv7()::text`),
    )
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id"),
    )
    .addColumn("stage", "text", (col) => col.notNull())
    .addColumn("status", "text")
    .addColumn("priority", "text")
    .addColumn("created_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("updated_by", "uuid", (col) => col.references("users.id"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("deleted_at", "timestamptz")
    .addColumn("reservation_expires_at", "timestamptz")
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("current_provider", "text", (col) => col.notNull())
    .addColumn("current_debit_rate", "numeric", (col) => col.notNull())
    .addColumn("current_credit_rate", "numeric", (col) => col.notNull())
    .addColumn("gpv", "numeric", (col) => col.notNull())
    .addColumn("ticket", "numeric", (col) => col.notNull())
    .addColumn("settlement_bank", "text", (col) =>
      col.notNull().references("workflow_settlement_banks.value"),
    )
    .addColumn("pos_count", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_organization")
    .on("workflow_leads")
    .column("organization_id")
    .unique()
    // Kysely only accepts the indexed column here, so other columns use sql.ref.
    .where(sql.ref("deleted_at"), "is", null)
    .where(sql.ref("stage"), "!=", "EXPIRED")
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_reservation")
    .on("workflow_leads")
    .column("reservation_expires_at")
    .where("reservation_expires_at", "is not", null)
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_status")
    .on("workflow_leads")
    .column("status")
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_priority")
    .on("workflow_leads")
    .column("priority")
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_stage")
    .on("workflow_leads")
    .column("stage")
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_deleted_at")
    .on("workflow_leads")
    .column("deleted_at")
    .execute();

  await db.schema
    .createTable("workflow_inquiries")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(sql`uuidv7()::text`),
    )
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("executive_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("state", "text", (col) => col.notNull().defaultTo("PENDING"))
    .addColumn("status", "text")
    .addColumn("priority", "text")
    .addColumn("answered_at", "timestamptz")
    .addColumn("answered_by", "uuid", (col) => col.references("users.id"))
    .addColumn("answered_by_job_id", "uuid")
    .addColumn("converted_lead_id", "text", (col) =>
      col.references("workflow_leads.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_inquiries_live_unique")
    .on("workflow_inquiries")
    .columns(["executive_id", "ruc"])
    .unique()
    .where(sql.ref("state"), "!=", "CONVERTED")
    .execute();

  await db.schema
    .createIndex("idx_workflow_inquiries_ruc")
    .on("workflow_inquiries")
    .columns(["ruc", "state"])
    .execute();

  await db.schema
    .createTable("workflow_lead_digital_policy")
    .addColumn("lead_id", "text", (col) =>
      col.primaryKey().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("link_scope", "text", (col) => col.notNull().defaultTo("none"))
    .addColumn("link_url", "text")
    .addColumn("online_scope", "text", (col) => col.notNull().defaultTo("none"))
    .addColumn("online_url", "text")
    .addColumn("online_collection_mode", "text", (col) =>
      col.references("workflow_collection_mode_kinds.value"),
    )
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_lead_favorites")
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_workflow_lead_favorites", [
      "lead_id",
      "user_id",
    ])
    .execute();

  await db.schema
    .createIndex("idx_workflow_lead_favorites_user")
    .on("workflow_lead_favorites")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("lead_sourcing_policies")
    .addColumn("branch_id", "uuid", (col) =>
      col.primaryKey().references("branches.id").onDelete("cascade"),
    )
    .addColumn("engine_assignment_enabled", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_integration_jobs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("requested_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("file_path", "text")
    .addColumn("error_message", "text")
    .addColumn("rows_total", "integer")
    .addColumn("rows_applied", "integer")
    .addColumn("rows_failed", "integer")
    .addColumn("results_json", "jsonb")
    .addColumn("lease_owner", "text")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_workflow_integration_jobs_claim")
    .on("workflow_integration_jobs")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();
}
