import { sql, type Kysely } from "kysely";

import { ABONO_BANKS } from "~/workflow/contracts/lead-schema";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_leads")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("ruc", "varchar(11)", (col) => col.notNull().unique())
    .addColumn("razon_social", "varchar(255)")
    .addColumn("address", "text")
    .addColumn("district", "varchar(100)")
    .addColumn("department", "varchar(100)")
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
    .execute();

  await db.schema
    .createIndex("idx_workflow_leads_ruc")
    .on("workflow_leads")
    .column("ruc")
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
    .createTable("workflow_lead_commercial_inputs")
    .addColumn("lead_id", "text", (col) =>
      col.primaryKey().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("proveedor_actual", "varchar(255)")
    .addColumn("tasa_actual", "real")
    .addColumn("gpv", "real")
    .addColumn("ticket", "real")
    .addColumn("giro_negocio", "text")
    .addColumn("tipo_producto", "varchar(20)", (col) =>
      col.check(
        sql`tipo_producto IN ('CULQI_FULL','CULQI_LINK','CULQI_ONLINE')`,
      ),
    )
    .addColumn("url_cliente", "text")
    .addColumn("modalidad_cobro", "varchar(20)", (col) =>
      col.check(
        sql`modalidad_cobro IN ('SUSCRIPCIONES','ONE_CLIC','CARGO_UNICO')`,
      ),
    )
    .addColumn("rep_legal_nombres", "varchar(255)")
    .addColumn("rep_legal_apellido_paterno", "varchar(255)")
    .addColumn("rep_legal_apellido_materno", "varchar(255)")
    .addColumn("rep_legal_dni", "varchar(8)")
    .addColumn("rep_legal_telefono", "varchar(20)")
    .addColumn("rep_legal_email", "varchar(255)")
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("updated_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_quotations")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("payback_pricing", "real", (col) => col.notNull())
    .addColumn("tarifa_debito", "real", (col) => col.notNull())
    .addColumn("tarifa_credito", "real", (col) => col.notNull())
    .addColumn("tarifa_foraneo", "real", (col) => col.notNull())
    .addColumn("fee", "real", (col) => col.notNull())
    .addColumn("moneda", "varchar(3)", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("created_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createIndex("idx_workflow_quotations_lead")
    .on("workflow_quotations")
    .columns(["lead_id", "version"])
    .execute();

  await db.schema
    .createTable("workflow_sales")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_sales_lead")
    .on("workflow_sales")
    .column("lead_id")
    .execute();
  await db.schema
    .createIndex("idx_workflow_sales_executive")
    .on("workflow_sales")
    .column("executive_id")
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
