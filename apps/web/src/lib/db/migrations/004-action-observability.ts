import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
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
}
