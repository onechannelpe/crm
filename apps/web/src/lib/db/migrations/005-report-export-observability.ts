import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("report_export_jobs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("requested_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("format", "varchar(10)", (col) => col.notNull())
    .addColumn("filters_json", "text", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("rows_count", "integer")
    .addColumn("file_storage_key", "varchar(255)")
    .addColumn("file_sha256", "varchar(64)")
    .addColumn("error_message", "text")
    .addColumn("requested_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .addColumn("expires_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_requester_time")
    .on("report_export_jobs")
    .columns(["requested_by_user_id", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_status_time")
    .on("report_export_jobs")
    .columns(["status", "requested_at"])
    .execute();

  await db.schema
    .createTable("report_export_downloads")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("export_job_id", "integer", (col) =>
      col.notNull().references("report_export_jobs.id").onDelete("cascade"),
    )
    .addColumn("downloaded_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("downloaded_at", "integer", (col) => col.notNull())
    .addColumn("ip_hash", "varchar(64)")
    .addColumn("user_agent_hash", "varchar(64)")
    .execute();

  await db.schema
    .createIndex("idx_report_export_downloads_job_time")
    .on("report_export_downloads")
    .columns(["export_job_id", "downloaded_at"])
    .execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.dropTable("report_export_downloads").execute();
  await db.schema.dropTable("report_export_jobs").execute();
}
