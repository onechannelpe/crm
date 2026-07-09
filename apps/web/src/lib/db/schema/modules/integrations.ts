import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_integration_import_rows")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("integration_job_id", "uuid", (col) =>
      col
        .notNull()
        .references("workflow_integration_jobs.id")
        .onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("status_value", "text")
    .addColumn("prioridad_value", "text")
    .addColumn("state", "text", (col) => col.notNull())
    .addColumn("lead_id", "text", (col) => col.references("workflow_leads.id"))
    .addColumn("failure_reason", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("applied_at", "timestamptz")
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
