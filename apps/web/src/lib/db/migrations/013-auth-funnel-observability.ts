import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
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
