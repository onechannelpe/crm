import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("team_id", "integer", (col) => col.references("teams.id"))
    .addColumn("username", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("names", "varchar(255)", (col) => col.notNull())
    .addColumn("first_surname", "varchar(255)", (col) => col.notNull())
    .addColumn("second_surname", "varchar(255)", (col) => col.notNull())
    .addColumn("avatar_storage_key", "varchar(255)")
    .addColumn("avatar_mime_type", "varchar(64)")
    .addColumn("avatar_updated_at", "integer")
    .addColumn("avatar_version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("onboarding_completed_at", "integer")
    .addColumn("role", "varchar(50)", (col) => col.notNull())
    .addColumn("executive_category", "varchar(20)")
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("expires_at", "integer")
    .addColumn("expiry_notified_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_users_email")
    .on("users")
    .column("email")
    .execute();

  await db.schema
    .createIndex("idx_users_onboarding")
    .on("users")
    .column("onboarding_completed_at")
    .execute();
}
