import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_invites")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("accepted_at", "timestamptz")
    .addColumn("revoked_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("sent_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_user_invites_branch_status_created")
    .on("user_invites")
    .columns(["branch_id", "status", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_user_invites_user_status")
    .on("user_invites")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createIndex("idx_user_invites_expires_status")
    .on("user_invites")
    .columns(["expires_at", "status"])
    .execute();

  await db.schema
    .createTable("action_rate_limit_counters")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("key_hash", "text", (col) => col.notNull())
    .addColumn("window_started_at", "timestamptz", (col) => col.notNull())
    .addColumn("request_count", "integer", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
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
}
