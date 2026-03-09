import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_oauth_accounts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("provider", "varchar(32)", (col) => col.notNull())
    .addColumn("provider_user_id", "varchar(255)", (col) => col.notNull())
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("uq_user_oauth_accounts_provider_user")
    .unique()
    .on("user_oauth_accounts")
    .columns(["provider", "provider_user_id"])
    .execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.dropTable("user_oauth_accounts").execute();
}
