import { sql } from "kysely";
import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("action_rate_limit_counters")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("key_hash", "varchar(64)", (col) => col.notNull())
    .addColumn("window_started_at", "integer", (col) => col.notNull())
    .addColumn("request_count", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_action_rate_limit_key")
    .on("action_rate_limit_counters")
    .column("key_hash")
    .unique()
    .execute();

  await db.schema
    .createIndex("idx_action_rate_limit_updated_at")
    .on("action_rate_limit_counters")
    .column("updated_at")
    .execute();

  const now = Date.now();
  await sql`
    INSERT INTO audit_action_policies (action, risk_level, is_active, is_protected, updated_by_user_id, created_at, updated_at)
    VALUES ('rate_limit_exceeded', 'high', 1, 1, NULL, ${now}, ${now})
    ON CONFLICT (action) DO NOTHING
  `.execute(db);
}
