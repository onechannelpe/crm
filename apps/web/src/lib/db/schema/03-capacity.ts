import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // Search capacity policy
  await db.schema
    .createTable("search_policy_defaults")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope_type", "varchar(20)", (col) => col.notNull())
    .addColumn("scope_id", "varchar(36)", (col) => col.notNull())
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
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("search_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer")
    .addColumn("set_by_user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_policy_override_user")
    .on("search_policy_overrides")
    .column("user_id")
    .execute();

  // Lead capacity policy
  await db.schema
    .createTable("lead_policy_defaults")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("scope_type", "varchar(20)", (col) => col.notNull())
    .addColumn("scope_id", "varchar(36)", (col) => col.notNull())
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
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("active_buffer_target", "integer", (col) => col.notNull())
    .addColumn("daily_refill_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer")
    .addColumn("set_by_user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_policy_override_user")
    .on("lead_policy_overrides")
    .column("user_id")
    .execute();

  // Search capacity ledger
  await db.schema
    .createTable("search_capacity_grants")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("actor_user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_capacity_grants_user")
    .on("search_capacity_grants")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createTable("search_usage_reservations")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_usage_reservations_user_status")
    .on("search_usage_reservations")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("search_usage_commits")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("reservation_id", "varchar(36)", (col) =>
      col.notNull().references("search_usage_reservations.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  // Lead capacity ledger
  await db.schema
    .createTable("lead_capacity_grants")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("actor_user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_capacity_grants_user")
    .on("lead_capacity_grants")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createTable("lead_usage_reservations")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_usage_reservations_user_status")
    .on("lead_usage_reservations")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("lead_usage_commits")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("reservation_id", "varchar(36)", (col) =>
      col.notNull().references("lead_usage_reservations.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  // Capacity requests (user-initiated requests for additional capacity)
  await db.schema
    .createTable("capacity_requests")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "varchar(36)", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("kind", "varchar(40)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("requested_amount", "integer", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("decision_note", "text")
    .addColumn("reviewer_user_id", "varchar(36)", (col) =>
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
}
