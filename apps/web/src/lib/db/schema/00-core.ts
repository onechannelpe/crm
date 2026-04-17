import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("branches")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("teams")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("branch_id", "varchar(36)", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("supervisor_id", "varchar(36)", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("organizations")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("locked_branch_id", "varchar(36)", (col) =>
      col.references("branches.id"),
    )
    .addColumn("locked_at", "integer")
    .addColumn("locked_by_user_id", "varchar(36)", (col) =>
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
