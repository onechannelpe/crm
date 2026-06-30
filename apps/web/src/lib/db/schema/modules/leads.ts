import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("organization_people")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("person_id", "uuid", (col) =>
      col.notNull().references("people.id").onDelete("cascade"),
    )
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("dni", "text", (col) => col.notNull())
    .addColumn("nombres", "text", (col) => col.notNull())
    .addColumn("apellido_paterno", "text", (col) => col.notNull())
    .addColumn("apellido_materno", "text", (col) => col.notNull())
    .addColumn("telefono", "text")
    .addColumn("email", "text")
    .addColumn("last_contacted_at", "timestamptz")
    .addColumn("last_contacted_by_user_id", "uuid", (col) =>
      col.references("users.id"),
    )
    .addColumn("cooldown_until", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addUniqueConstraint("idx_organization_people_org_dni_unique", [
      "organization_id",
      "dni",
    ])
    .addUniqueConstraint("idx_organization_people_org_person_unique", [
      "organization_id",
      "person_id",
    ])
    .execute();

  await db.schema
    .createTable("organization_person_roles")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("organization_person_id", "uuid", (col) =>
      col.notNull().references("organization_people.id").onDelete("cascade"),
    )
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("is_primary", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("effective_from", "timestamptz", (col) => col.notNull())
    .addColumn("effective_to", "timestamptz")
    .addUniqueConstraint("idx_org_person_role_unique", [
      "organization_person_id",
      "role",
      "effective_to",
    ])
    .execute();

  await db.schema
    .createTable("lead_assignments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("contact_id", "uuid", (col) =>
      col.notNull().references("organization_people.id"),
    )
    .addColumn("assigned_at", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_assignments_user")
    .on("lead_assignments")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("interaction_logs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("contact_id", "uuid", (col) =>
      col.notNull().references("organization_people.id"),
    )
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("outcome", "text", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();
}
