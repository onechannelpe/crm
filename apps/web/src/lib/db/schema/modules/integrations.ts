import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_integration_import_rows")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("integration_job_id", "text", (col) =>
      col
        .notNull()
        .references("workflow_integration_jobs.id")
        .onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("type", "varchar(30)", (col) => col.notNull())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull())
    .addColumn("status_value", "varchar(40)")
    .addColumn("prioridad_value", "varchar(40)")
    .addColumn("state", "varchar(20)", (col) => col.notNull())
    .addColumn("lead_id", "text", (col) => col.references("workflow_leads.id"))
    .addColumn("failure_reason", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("applied_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_workflow_import_rows_job_state")
    .on("workflow_integration_import_rows")
    .columns(["integration_job_id", "state", "row_number"])
    .execute();

  await db.schema
    .createIndex("idx_workflow_import_rows_job_row")
    .on("workflow_integration_import_rows")
    .columns(["integration_job_id", "row_number"])
    .unique()
    .execute();
}
