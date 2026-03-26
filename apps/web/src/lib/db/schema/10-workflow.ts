import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("pipeline_leads")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("ruc", "varchar(11)", (col) => col.notNull().unique())
    .addColumn("razon_social", "varchar(255)")
    .addColumn("address", "text")
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("stage", "varchar(30)", (col) => col.notNull())
    .addColumn("status", "varchar(30)")
    .addColumn("prioridad", "varchar(20)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_pipeline_leads_ruc")
    .on("pipeline_leads")
    .column("ruc")
    .execute();
  await db.schema
    .createIndex("idx_pipeline_leads_executive")
    .on("pipeline_leads")
    .column("executive_id")
    .execute();
  await db.schema
    .createIndex("idx_pipeline_leads_status")
    .on("pipeline_leads")
    .column("status")
    .execute();
  await db.schema
    .createIndex("idx_pipeline_leads_prioridad")
    .on("pipeline_leads")
    .column("prioridad")
    .execute();
  await db.schema
    .createIndex("idx_pipeline_leads_stage")
    .on("pipeline_leads")
    .column("stage")
    .execute();

  await db.schema
    .createTable("pipeline_lead_commercial_inputs")
    .addColumn("lead_id", "integer", (col) =>
      col.primaryKey().references("pipeline_leads.id").onDelete("cascade"),
    )
    .addColumn("proveedor_actual", "varchar(255)")
    .addColumn("tasa_actual", "real")
    .addColumn("gpv", "real")
    .addColumn("ticket", "real")
    .addColumn("abono", "real")
    .addColumn("cantidad_pos", "integer")
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("updated_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("pipeline_quotations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "integer", (col) =>
      col.notNull().references("pipeline_leads.id").onDelete("cascade"),
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
    .createIndex("idx_pipeline_quotations_lead")
    .on("pipeline_quotations")
    .columns(["lead_id", "version"])
    .execute();

  await db.schema
    .createTable("pipeline_sales")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "integer", (col) =>
      col.notNull().references("pipeline_leads.id"),
    )
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("proveedor_actual", "varchar(255)", (col) => col.notNull())
    .addColumn("tasa_actual", "real", (col) => col.notNull())
    .addColumn("gpv", "real", (col) => col.notNull())
    .addColumn("ticket", "real", (col) => col.notNull())
    .addColumn("abono", "real", (col) => col.notNull())
    .addColumn("cantidad_pos", "integer", (col) => col.notNull())
    .addColumn("banco", "varchar(100)", (col) => col.notNull())
    .addColumn("nro_cuenta", "varchar(50)", (col) => col.notNull())
    .addColumn("cci", "varchar(50)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_pipeline_sales_lead")
    .on("pipeline_sales")
    .column("lead_id")
    .execute();
  await db.schema
    .createIndex("idx_pipeline_sales_executive")
    .on("pipeline_sales")
    .column("executive_id")
    .execute();

  await db.schema
    .createTable("pipeline_lead_assignments")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "integer", (col) =>
      col.notNull().references("pipeline_leads.id"),
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
    .createIndex("idx_pipeline_lead_assignments_lead")
    .on("pipeline_lead_assignments")
    .columns(["lead_id", "is_active"])
    .execute();

  await db.schema
    .createTable("pipeline_integration_jobs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("type", "varchar(30)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
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
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_pipeline_integration_jobs_status")
    .on("pipeline_integration_jobs")
    .columns(["status", "lease_until"])
    .execute();
}
