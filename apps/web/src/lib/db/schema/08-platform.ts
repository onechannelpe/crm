import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_invites")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("role", "varchar(50)", (col) => col.notNull())
    .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("created_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("accepted_at", "integer")
    .addColumn("revoked_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("sent_at", "integer")
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
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    // varchar(64) = HMAC-SHA-256 hex output; update length if hashAuthKey algorithm changes
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
}
