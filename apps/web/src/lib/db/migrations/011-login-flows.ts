import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("login_flows")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("identifier", "varchar(255)", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("state", "varchar(32)", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_login_flows_expires_at")
    .on("login_flows")
    .column("expires_at")
    .execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.dropTable("login_flows").execute();
}
