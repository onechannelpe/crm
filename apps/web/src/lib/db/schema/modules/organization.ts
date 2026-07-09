import { sql, type Kysely } from "kysely";

// The organization/person directory: the system of record for companies (by
// RUC), natural persons (by DNI), a person's membership in an organization, and
// the temporal roles that membership carries. One writer owns these tables (the
// organization repo); other contexts reference them by id.
export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("people")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("dni", "text", (col) => col.notNull().unique())
    // Name columns match the `users` convention (names/first_surname/
    // second_surname). Surnames are nullable here because a prospected person
    // may be known only by a single unstructured display string.
    .addColumn("names", "text", (col) => col.notNull())
    .addColumn("first_surname", "text")
    .addColumn("second_surname", "text")
    .addColumn("email", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_people_dni")
    .on("people")
    .column("dni")
    .execute();

  await db.schema
    .createTable("organizations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("ruc", "text", (col) => col.notNull().unique())
    .addColumn("legal_name", "text")
    .addColumn("line_of_business", "text")
    .addColumn("address", "text")
    .addColumn("district", "text")
    .addColumn("province", "text")
    .addColumn("department", "text")
    .addColumn("phone", "text")
    .addColumn("email", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_organizations_ruc")
    .on("organizations")
    .column("ruc")
    .execute();

  // Membership = a person's presence at an organization. Identity (name, dni,
  // personal email) lives on `people`; this table carries only the membership
  // and its org-scoped contact channel. Contact cadence is a separate concern
  // owned by contact-assignments (see contact_cadence).
  await db.schema
    .createTable("organization_people")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("person_id", "uuid", (col) =>
      col.notNull().references("people.id").onDelete("cascade"),
    )
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("phone", "text")
    .addColumn("email", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
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
}
