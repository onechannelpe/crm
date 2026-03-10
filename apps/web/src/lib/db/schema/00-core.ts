import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("branches")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("teams")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("supervisor_id", "integer", (col) => col.references("users.id"))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("organizations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("locked_branch_id", "integer", (col) =>
      col.references("branches.id"),
    )
    .addColumn("locked_at", "integer")
    .addColumn("locked_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_organizations_ruc")
    .on("organizations")
    .column("ruc")
    .execute();
}
