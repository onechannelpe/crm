import type { Kysely } from "kysely";

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
    .addColumn("prioridad", "varchar(20)")
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
    .execute();

  // Only one *active* lead may hold a given RUC at a time. Released leads
  // (EXPIRED) and soft-deleted leads drop out of the constraint so the RUC can
  // be registered fresh while the old lead and its evidence stay as history.
  await db.schema
    .createIndex("idx_workflow_leads_organization")
    .on("workflow_leads")
    .column("organization_id")
    .unique()
    .where("deleted_at", "is", null)
    .where("stage", "!=", "EXPIRED")
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
    .createIndex("idx_workflow_leads_prioridad")
    .on("workflow_leads")
    .column("prioridad")
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
    .createTable("workflow_modalidad_cobro_kinds")
    .addColumn("value", "varchar(20)", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_lead_profiles")
    .addColumn("lead_id", "text", (col) =>
      col.primaryKey().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("proveedor_actual", "varchar(255)")
    .addColumn("tasa_actual", "real")
    .addColumn("gpv", "real")
    .addColumn("ticket", "real")
    .addColumn("link_scope", "text", (col) => col.notNull().defaultTo("none"))
    .addColumn("link_url", "text")
    .addColumn("online_scope", "text", (col) => col.notNull().defaultTo("none"))
    .addColumn("online_url", "text")
    .addColumn("online_modalidad", "varchar(20)", (col) =>
      col.references("workflow_modalidad_cobro_kinds.value"),
    )
    .addColumn("abono_bank", "varchar(50)", (col) =>
      col.references("workflow_abono_banks.value"),
    )
    .addColumn("pos_total", "integer")
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
    .createTable("workflow_history_events")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("event_type", "varchar(40)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer", (col) => col.references("users.id"))
    .addColumn("subject_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("payload_json", "text")
    .addColumn("occurred_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_history_events_lead")
    .on("workflow_history_events")
    .columns(["lead_id", "occurred_at"])
    .execute();

  await db.schema
    .createTable("workflow_audit_logs")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("action", "varchar(255)", (col) => col.notNull())
    .addColumn("entity_type", "varchar(100)", (col) => col.notNull())
    .addColumn("entity_id", "text", (col) => col.notNull())
    .addColumn("changes", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_audit_entity_created")
    .on("workflow_audit_logs")
    .columns(["entity_type", "entity_id", "created_at"])
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
    .addColumn("available_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_workflow_integration_jobs_status")
    .on("workflow_integration_jobs")
    .columns(["status", "available_at", "lease_until"])
    .execute();
}
