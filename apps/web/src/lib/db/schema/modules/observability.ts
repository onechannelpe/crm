import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // The events spine: one append-only log of every meaningful domain
  // occurrence (lead lifecycle, auth/security actions, invites, capacity
  // decisions). The per-entity activity feed and the cross-entity audit
  // explorer are two read projections of this table; nothing writes audit by
  // hand. entity_id is text so it can key both numeric ids (users, branches)
  // and uuids (leads) under one schema. changes_json holds a FieldChange[] for
  // value corrections; payload_json holds heterogeneous per-type event data.
  await db.schema
    .createTable("events")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("entity_type", "varchar(40)", (col) => col.notNull())
    .addColumn("entity_id", "text", (col) => col.notNull())
    .addColumn("type", "varchar(64)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer", (col) => col.references("users.id"))
    .addColumn("subject_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("payload_json", "text")
    .addColumn("changes_json", "text")
    .addColumn("occurred_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_events_occurred")
    .on("events")
    .column("occurred_at")
    .execute();

  await db.schema
    .createIndex("idx_events_type_occurred")
    .on("events")
    .columns(["type", "occurred_at"])
    .execute();

  await db.schema
    .createIndex("idx_events_actor_occurred")
    .on("events")
    .columns(["actor_user_id", "occurred_at"])
    .execute();

  // Drives both the per-entity activity feed (lead timeline) and entity-scoped
  // audit lookups.
  await db.schema
    .createIndex("idx_events_entity_occurred")
    .on("events")
    .columns(["entity_type", "entity_id", "occurred_at"])
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
    .createTable("agent_status_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("latitude", "real", (col) => col.notNull())
    .addColumn("longitude", "real", (col) => col.notNull())
    .addColumn("comment", "text")
    .addColumn("started_at", "integer", (col) => col.notNull())
    .addColumn("ended_at", "integer")
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
