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
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("branch_supervisors")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addUniqueConstraint("idx_branch_supervisors_unique", [
      "branch_id",
      "user_id",
    ])
    .execute();

  await db.schema
    .createTable("back_office_assignments")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("back_office_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("team_id", "integer", (col) =>
      col.notNull().references("teams.id"),
    )
    .addColumn("assigned_at", "integer", (col) => col.notNull())
    .addUniqueConstraint("idx_back_office_assignments_unique", [
      "back_office_user_id",
      "team_id",
    ])
    .execute();

  await db.schema
    .createTable("people")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("dni", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("full_name", "varchar(255)", (col) => col.notNull())
    .addColumn("email", "varchar(255)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_people_dni")
    .on("people")
    .column("dni")
    .execute();

  await db.schema
    .createTable("organizations")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("ruc", "varchar(20)", (col) => col.notNull().unique())
    .addColumn("legal_name", "varchar(255)")
    .addColumn("giro_negocio", "text")
    .addColumn("address", "text")
    .addColumn("district", "varchar(100)")
    .addColumn("province", "varchar(100)")
    .addColumn("department", "varchar(100)")
    .addColumn("phone", "varchar(20)")
    .addColumn("email", "varchar(255)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_organizations_ruc")
    .on("organizations")
    .column("ruc")
    .execute();

  await db.schema
    .createTable("organization_branch_locks")
    .addColumn("organization_id", "text", (col) =>
      col.primaryKey().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("locked_at", "integer", (col) => col.notNull())
    .addColumn("locked_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createIndex("idx_organization_branch_locks_branch")
    .on("organization_branch_locks")
    .column("branch_id")
    .execute();
}
