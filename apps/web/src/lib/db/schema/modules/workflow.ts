import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_leads")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("organization_id", "text", (col) =>
      col.notNull().references("organizations.id"),
    )
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("stage", "varchar(30)", (col) => col.notNull())
    .addColumn("status", "varchar(30)")
    .addColumn("priority", "varchar(20)")
    .addColumn("created_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("updated_by", "integer", (col) => col.references("users.id"))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("deleted_at", "integer")
    // When set, the lead holds its RUC until this timestamp.
    // Null for stages that are not time-boxed (pre-quotation QUALIFYING,
    // won SETUP/LIVE, and terminal stages).
    .addColumn("reservation_expires_at", "integer")
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("current_provider", "varchar(255)", (col) => col.notNull())
    .addColumn("current_debit_rate", "real", (col) => col.notNull())
    .addColumn("current_credit_rate", "real", (col) => col.notNull())
    .addColumn("gpv", "real", (col) => col.notNull())
    .addColumn("ticket", "real", (col) => col.notNull())
    .addColumn("settlement_bank", "varchar(50)", (col) =>
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
    .addColumn("result_json", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("workflow_collection_mode_kinds")
    .addColumn("value", "varchar(20)", (col) => col.primaryKey())
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
    .addColumn("online_collection_mode", "varchar(20)", (col) =>
      col.references("workflow_collection_mode_kinds.value"),
    )
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("updated_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_lead_assignments")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id"),
    )
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("assigned_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("assigned_at", "integer", (col) => col.notNull())
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
    .where("is_active", "=", 1)
    .execute();

  await db.schema
    .createTable("workflow_lead_favorites")
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
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
    .addColumn("branch_id", "integer", (col) =>
      col.primaryKey().references("branches.id").onDelete("cascade"),
    )
    .addColumn("engine_assignment_enabled", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("updated_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_integration_jobs")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("type", "varchar(30)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("queue_state", "varchar(20)", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("requested_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("file_path", "text")
    .addColumn("error_message", "text")
    .addColumn("rows_total", "integer")
    .addColumn("rows_applied", "integer")
    .addColumn("rows_failed", "integer")
    .addColumn("results_json", "text")
    .addColumn("lease_owner", "varchar(100)")
    .addColumn("lease_until", "integer")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_workflow_integration_jobs_queue_state")
    .on("workflow_integration_jobs")
    .columns(["queue_state", "available_at", "lease_until"])
    .execute();
}
