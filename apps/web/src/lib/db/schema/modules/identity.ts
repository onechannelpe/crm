import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("branch_id", "uuid", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("team_id", "uuid", (col) => col.references("teams.id"))
    .addColumn("username", "text", (col) => col.notNull().unique())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("password_hash", "text", (col) => col.notNull())
    .addColumn("names", "text", (col) => col.notNull())
    .addColumn("first_surname", "text", (col) => col.notNull())
    .addColumn("second_surname", "text", (col) => col.notNull())
    .addColumn("avatar_storage_key", "text")
    .addColumn("avatar_mime_type", "text")
    .addColumn("avatar_updated_at", "timestamptz")
    .addColumn("avatar_version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("onboarding_completed_at", "timestamptz")
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("executive_category", "text")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("expires_at", "timestamptz")
    .addColumn("expiry_notified_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
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
