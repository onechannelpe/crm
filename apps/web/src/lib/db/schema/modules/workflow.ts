import { sql, type Kysely } from "kysely";

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
    .addColumn("executive_id", "uuid", (col) =>
      col.notNull().references("users.id"),
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
    // When set, the lead holds its RUC until this timestamp.
    // Null for stages that are not time-boxed (pre-quotation QUALIFYING,
    // won SETUP/LIVE, and terminal stages).
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

  // Only one *active* lead may hold a given RUC at a time. Released leads
  // (EXPIRED) and soft-deleted leads drop out of the constraint so the RUC can
  // be registered fresh while the old lead and its evidence stay as history.
  await db.schema
    .createIndex("idx_workflow_leads_organization")
    .on("workflow_leads")
    .column("organization_id")
    .unique()
    // sql.ref bypasses createIndex().where typing, which only accepts the
    // indexed column literal. Same pattern as the search-outbox partial index.
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
    .createIndex("idx_workflow_leads_executive")
    .on("workflow_leads")
    .column("executive_id")
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
    .createTable("workflow_idempotency_keys")
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("result_json", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
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
    .createTable("workflow_lead_assignments")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(sql`uuidv7()::text`),
    )
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id"),
    )
    .addColumn("executive_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("assigned_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("assigned_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_lead_assignments_lead")
    .on("workflow_lead_assignments")
    .columns(["lead_id", "is_active"])
    .execute();

  await db.schema
    .createIndex("idx_workflow_lead_assignments_active_unique")
    .on("workflow_lead_assignments")
    .columns(["lead_id", "is_active"])
    .unique()
    .where("is_active", "=", true)
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
    .addColumn("status", "text", (col) => col.notNull())
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
    .addColumn("lease_until", "timestamptz")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("available_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_workflow_integration_jobs_claim")
    .on("workflow_integration_jobs")
    .column("available_at")
    .where(sql.ref("queue_state"), "=", "pending")
    .execute();

  await db.schema
    .createIndex("idx_workflow_integration_jobs_stale")
    .on("workflow_integration_jobs")
    .column("lease_until")
    .where(sql.ref("queue_state"), "=", "processing")
    .execute();
}
