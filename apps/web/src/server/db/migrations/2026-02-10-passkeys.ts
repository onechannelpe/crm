import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("passkeys")
    .ifNotExists()
    .addColumn("id", "varchar(512)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("public_key", "text", (col) => col.notNull())
    .addColumn("counter", "integer", (col) => col.notNull())
    .addColumn("transports", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("last_used_at", "integer")
    .execute();

  await db.schema
    .createTable("webauthn_challenges")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) => col.references("users.id"))
    .addColumn("type", "varchar(32)", (col) => col.notNull())
    .addColumn("challenge", "varchar(512)", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("webauthn_challenges").execute();
  await db.schema.dropTable("passkeys").execute();
}
