import { sql, type Kysely } from "kysely";

import type { Database } from "../../types";

// One writer (the organization repo) owns these tables; other contexts
// reference rows by id and never write organization/person identity columns.
export async function createTables(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("people")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("dni", "text", (col) => col.notNull().unique())
    // Surnames nullable: a prospected person may be known only by a single
    // unstructured `names` string.
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

  await db.schema
    .createTable("organization_owner_assignments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("executive_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("valid_from", "timestamptz", (col) => col.notNull())
    .addColumn("valid_until", "timestamptz")
    .addColumn("assigned_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("reason", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addCheckConstraint(
      "organization_owner_assignment_period",
      sql`valid_until is null or valid_until > valid_from`,
    )
    .execute();

  await db.schema
    .createIndex("idx_organization_owner_assignments_current")
    .on("organization_owner_assignments")
    .column("organization_id")
    .unique()
    .where(sql.ref("valid_until"), "is", null)
    .execute();

  await db.schema
    .createIndex("idx_organization_owner_assignments_executive")
    .on("organization_owner_assignments")
    .columns(["executive_id", "valid_until"])
    .execute();

  await db.schema
    .createView("organization_current_owners")
    .as(
      db
        .selectFrom("organization_owner_assignments")
        .select([
          "organization_id",
          "executive_id",
          "valid_from as assigned_at",
        ])
        .where("valid_until", "is", null),
    )
    .execute();

  // Identity (name, dni, personal email) lives on `people`; this row
  // carries only the membership and its org-scoped contact channel. Contact
  // cadence is a separate concern owned by contact-assignments.
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
