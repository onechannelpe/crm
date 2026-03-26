import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("contacts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("organization_id", "integer", (col) =>
      col.notNull().references("organizations.id"),
    )
    .addColumn("dni", "varchar(20)", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("phone_primary", "varchar(20)")
    .addColumn("phone_secondary", "varchar(20)")
    .addColumn("last_contacted_at", "integer")
    .addColumn("last_contacted_by_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("cooldown_until", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_contacts_dni")
    .on("contacts")
    .column("dni")
    .execute();

  await db.schema
    .createTable("lead_assignments")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("contact_id", "integer", (col) =>
      col.notNull().references("contacts.id"),
    )
    .addColumn("assigned_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_assignments_user")
    .on("lead_assignments")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("interaction_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("contact_id", "integer", (col) =>
      col.notNull().references("contacts.id"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("outcome", "varchar(255)", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("agent_status_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("latitude", "real", (col) => col.notNull())
    .addColumn("longitude", "real", (col) => col.notNull())
    .addColumn("comment", "text")
    .addColumn("started_at", "integer", (col) => col.notNull())
    .addColumn("ended_at", "integer")
    .execute();
}
