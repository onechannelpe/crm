import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("contacts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("dni", "varchar(20)")
    .addColumn("phone_primary", "varchar(20)")
    .addColumn("phone_secondary", "varchar(20)")
    .addColumn("org_name", "varchar(255)", (col) => col.notNull())
    .addColumn("org_ruc", "varchar(20)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("uploaded_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createIndex("contacts_phone_primary_idx")
    .on("contacts")
    .column("phone_primary")
    .execute();

  await db.schema
    .createIndex("contacts_phone_secondary_idx")
    .on("contacts")
    .column("phone_secondary")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("contacts").execute();
}
