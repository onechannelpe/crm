import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("pipeline_integration_import_rows")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("integration_job_id", "integer", (col) =>
      col
        .notNull()
        .references("pipeline_integration_jobs.id")
        .onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("type", "varchar(30)", (col) => col.notNull())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull())
    .addColumn("status_value", "varchar(40)")
    .addColumn("prioridad_value", "varchar(40)")
    .addColumn("state", "varchar(20)", (col) => col.notNull())
    .addColumn("lead_id", "integer", (col) =>
      col.references("pipeline_leads.id"),
    )
    .addColumn("failure_reason", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("applied_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_pipeline_import_rows_job_state")
    .on("pipeline_integration_import_rows")
    .columns(["integration_job_id", "state", "row_number"])
    .execute();

  await db.schema
    .createIndex("idx_pipeline_import_rows_job_row")
    .on("pipeline_integration_import_rows")
    .columns(["integration_job_id", "row_number"])
    .unique()
    .execute();

  await db.schema
    .createTable("pipeline_integration_outbox_needs_executive_input")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "integer", (col) =>
      col.notNull().references("pipeline_leads.id"),
    )
    .addColumn("ruc", "varchar(20)", (col) => col.notNull())
    .addColumn("executive_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("lease_owner", "varchar(100)")
    .addColumn("lease_until", "integer")
    .addColumn("error_message", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_pipeline_outbox_needs_exec_status")
    .on("pipeline_integration_outbox_needs_executive_input")
    .columns(["status", "available_at", "lease_until"])
    .execute();

  await db.schema
    .createTable("pipeline_integration_outbox_ready_for_quotation")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "integer", (col) =>
      col.notNull().references("pipeline_leads.id"),
    )
    .addColumn("ruc", "varchar(20)", (col) => col.notNull())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "integer", (col) => col.notNull())
    .addColumn("lease_owner", "varchar(100)")
    .addColumn("lease_until", "integer")
    .addColumn("error_message", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_pipeline_outbox_ready_quote_status")
    .on("pipeline_integration_outbox_ready_for_quotation")
    .columns(["status", "available_at", "lease_until"])
    .execute();
}
