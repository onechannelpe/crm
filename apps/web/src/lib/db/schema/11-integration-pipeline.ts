import { sql, type Kysely } from "kysely";

const DEFAULT_UUID_SQL = sql<string>`(
  lower(
    hex(randomblob(4)) || '-' ||
    hex(randomblob(2)) || '-' ||
    '4' || substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
    hex(randomblob(6))
  )
)`;

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_integration_import_rows")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(DEFAULT_UUID_SQL),
    )
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

  await db.schema
    .createTable("workflow_integration_outbox_needs_executive_input")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(DEFAULT_UUID_SQL),
    )
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id"),
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
    .createIndex("idx_workflow_outbox_needs_exec_status")
    .on("workflow_integration_outbox_needs_executive_input")
    .columns(["status", "available_at", "lease_until"])
    .execute();

  await db.schema
    .createTable("workflow_integration_outbox_ready_for_quotation")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(DEFAULT_UUID_SQL),
    )
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id"),
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
    .createIndex("idx_workflow_outbox_ready_quote_status")
    .on("workflow_integration_outbox_ready_for_quotation")
    .columns(["status", "available_at", "lease_until"])
    .execute();
}
