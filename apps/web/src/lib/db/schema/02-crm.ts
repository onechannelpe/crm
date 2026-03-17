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
    .createTable("search_policy_defaults")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope_type", "varchar(20)", (col) => col.notNull())
    .addColumn("scope_id", "integer", (col) => col.notNull())
    .addColumn("period_type", "varchar(20)", (col) => col.notNull())
    .addColumn("search_limit", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_policy_scope")
    .on("search_policy_defaults")
    .columns(["scope_type", "scope_id"])
    .execute();

  await db.schema
    .createTable("search_policy_overrides")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("search_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer")
    .addColumn("set_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_policy_override_user")
    .on("search_policy_overrides")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("lead_policy_defaults")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope_type", "varchar(20)", (col) => col.notNull())
    .addColumn("scope_id", "integer", (col) => col.notNull())
    .addColumn("active_buffer_target", "integer", (col) => col.notNull())
    .addColumn("daily_refill_limit", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_policy_scope")
    .on("lead_policy_defaults")
    .columns(["scope_type", "scope_id"])
    .execute();

  await db.schema
    .createTable("lead_policy_overrides")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("active_buffer_target", "integer", (col) => col.notNull())
    .addColumn("daily_refill_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer")
    .addColumn("set_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_policy_override_user")
    .on("lead_policy_overrides")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("capacity_requests")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("kind", "varchar(40)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("requested_amount", "integer", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("decision_note", "text")
    .addColumn("reviewer_user_id", "integer", (col) =>
      col.references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("decided_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_capacity_requests_user_status")
    .on("capacity_requests")
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
