import { sql, type Kysely } from "kysely";

// All tables here reference the organization directory by id; none write
// organization/person identity columns.
export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("contact_assignments")
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
    .createIndex("idx_contact_assignments_user")
    .on("contact_assignments")
    .columns(["user_id", "status"])
    .execute();

  // Contact cadence is a per-membership assignment concern, kept off the
  // identity row so the organization directory has a single writer.
  await db.schema
    .createTable("contact_cadence")
    .addColumn("organization_person_id", "uuid", (col) =>
      col.primaryKey().references("organization_people.id").onDelete("cascade"),
    )
    .addColumn("last_contacted_at", "timestamptz")
    .addColumn("last_contacted_by_user_id", "uuid", (col) =>
      col.references("users.id"),
    )
    .addColumn("cooldown_until", "timestamptz")
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
