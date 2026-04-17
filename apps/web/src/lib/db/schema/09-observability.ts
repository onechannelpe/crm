import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("action", "varchar(255)", (col) => col.notNull())
    .addColumn("entity_type", "varchar(100)", (col) => col.notNull())
    .addColumn("entity_id", "varchar(64)", (col) => col.notNull())
    .addColumn("changes", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_audit_created_at")
    .on("audit_logs")
    .column("created_at")
    .execute();

  await db.schema
    .createIndex("idx_audit_action_created")
    .on("audit_logs")
    .columns(["action", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_audit_user_created")
    .on("audit_logs")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_audit_entity_created")
    .on("audit_logs")
    .columns(["entity_type", "entity_id", "created_at"])
    .execute();

  await db.schema
    .createTable("audit_action_policies")
    .addColumn("action", "varchar(120)", (col) => col.primaryKey())
    .addColumn("risk_level", "varchar(10)", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("is_protected", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("updated_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_audit_policy_risk_active")
    .on("audit_action_policies")
    .columns(["risk_level", "is_active"])
    .execute();

  await db.schema
    .createTable("action_observations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("trace_id", "varchar(64)", (col) => col.notNull())
    .addColumn("request_id", "varchar(64)", (col) => col.notNull())
    .addColumn("route_path", "varchar(255)")
    .addColumn("http_method", "varchar(10)")
    .addColumn("action_name", "varchar(120)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer", (col) => col.references("users.id"))
    .addColumn("actor_role", "varchar(50)")
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("duration_ms", "integer", (col) => col.notNull())
    .addColumn("error_code", "varchar(120)")
    .addColumn("error_category", "varchar(40)", (col) => col.notNull())
    .addColumn("public_error", "varchar(120)")
    .addColumn("is_sensitive", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("input_summary", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_action_observations_created")
    .on("action_observations")
    .column("created_at")
    .execute();

  await db.schema
    .createIndex("idx_action_observations_action_created")
    .on("action_observations")
    .columns(["action_name", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_action_observations_status_created")
    .on("action_observations")
    .columns(["status", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_action_observations_actor_created")
    .on("action_observations")
    .columns(["actor_user_id", "created_at"])
    .execute();

  await db.schema
    .createTable("auth_funnel_events")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("trace_id", "varchar(64)", (col) => col.notNull())
    .addColumn("request_id", "varchar(64)", (col) => col.notNull())
    .addColumn("route_path", "varchar(255)")
    .addColumn("source", "varchar(16)", (col) => col.notNull())
    .addColumn("event_name", "varchar(64)", (col) => col.notNull())
    .addColumn("screen", "varchar(64)")
    .addColumn("method", "varchar(32)")
    .addColumn("outcome", "varchar(32)", (col) => col.notNull())
    .addColumn("code", "varchar(64)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_auth_funnel_events_created")
    .on("auth_funnel_events")
    .column("created_at")
    .execute();

  await db.schema
    .createIndex("idx_auth_funnel_events_event_created")
    .on("auth_funnel_events")
    .columns(["event_name", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_auth_funnel_events_source_created")
    .on("auth_funnel_events")
    .columns(["source", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_auth_funnel_events_method_created")
    .on("auth_funnel_events")
    .columns(["method", "created_at"])
    .execute();

  await db.schema
    .createTable("report_export_jobs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("requested_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
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
    .addColumn("lease_owner", "varchar(64)")
    .addColumn("lease_until", "integer")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("available_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_requester_time")
    .on("report_export_jobs")
    .columns(["requested_by_user_id", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_status_lease_time")
    .on("report_export_jobs")
    .columns(["status", "available_at", "lease_until", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_branch_time")
    .on("report_export_jobs")
    .columns(["branch_id", "requested_at"])
    .execute();

  await db.schema
    .createIndex("idx_report_export_jobs_expires_time")
    .on("report_export_jobs")
    .columns(["status", "expires_at"])
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
