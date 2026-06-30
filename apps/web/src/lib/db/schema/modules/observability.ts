import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // entity_id is text so one append-only table can key numeric ids and UUIDs.
  // changes_json holds FieldChange[] corrections; payload_json holds
  // heterogeneous per-type event data.
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
}
