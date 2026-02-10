import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("branch_id", "integer", (col) => col.notNull())
    .addColumn("team_id", "integer")
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("full_name", "varchar(255)", (col) => col.notNull())
    .addColumn("role", "varchar(50)", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "varchar(255)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("lead_assignments")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("contact_id", "integer", (col) => col.notNull())
    .addColumn("assigned_at", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("products")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("category", "varchar(50)", (col) => col.notNull())
    .addColumn("subtype", "varchar(50)")
    .addColumn("price", "real", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable("charge_notes")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("contact_id", "integer", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .addColumn("exec_code_real", "varchar(255)")
    .addColumn("exec_code_tdp", "varchar(255)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("charge_note_items")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("product_id", "integer", (col) =>
      col.notNull().references("products.id"),
    )
    .addColumn("quantity", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("rejection_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("charge_note_id", "integer", (col) =>
      col.notNull().references("charge_notes.id"),
    )
    .addColumn("reviewer_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("field_id", "varchar(255)", (col) => col.notNull())
    .addColumn("reviewer_note", "text")
    .addColumn("is_resolved", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("interaction_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("contact_id", "integer", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("outcome", "varchar(255)", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("stage_history")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("entity_type", "varchar(255)", (col) => col.notNull())
    .addColumn("entity_id", "integer", (col) => col.notNull())
    .addColumn("from_status", "varchar(255)")
    .addColumn("to_status", "varchar(255)", (col) => col.notNull())
    .addColumn("actor_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("stage_history").execute();
  await db.schema.dropTable("interaction_logs").execute();
  await db.schema.dropTable("rejection_logs").execute();
  await db.schema.dropTable("charge_note_items").execute();
  await db.schema.dropTable("charge_notes").execute();
  await db.schema.dropTable("products").execute();
  await db.schema.dropTable("lead_assignments").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();
}
