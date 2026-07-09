import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("search_policy_defaults")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("scope_type", "text", (col) => col.notNull())
    .addColumn("scope_id", "uuid", (col) => col.notNull())
    .addColumn("period_type", "text", (col) => col.notNull())
    .addColumn("search_limit", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_policy_scope")
    .on("search_policy_defaults")
    .columns(["scope_type", "scope_id"])
    .execute();

  await db.schema
    .createTable("search_policy_overrides")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("search_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz")
    .addColumn("set_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_policy_override_user")
    .on("search_policy_overrides")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("lead_policy_defaults")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("scope_type", "text", (col) => col.notNull())
    .addColumn("scope_id", "uuid", (col) => col.notNull())
    .addColumn("active_buffer_target", "integer", (col) => col.notNull())
    .addColumn("daily_refill_limit", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_policy_scope")
    .on("lead_policy_defaults")
    .columns(["scope_type", "scope_id"])
    .execute();

  await db.schema
    .createTable("lead_policy_overrides")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("active_buffer_target", "integer", (col) => col.notNull())
    .addColumn("daily_refill_limit", "integer", (col) => col.notNull())
    .addColumn("effective_from", "timestamptz", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz")
    .addColumn("set_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_policy_override_user")
    .on("lead_policy_overrides")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("search_capacity_grants")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("actor_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_capacity_grants_user")
    .on("search_capacity_grants")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createTable("search_usage_reservations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_search_usage_reservations_user_status")
    .on("search_usage_reservations")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("search_usage_commits")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("reservation_id", "uuid", (col) =>
      col.notNull().references("search_usage_reservations.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("lead_capacity_grants")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("actor_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_capacity_grants_user")
    .on("lead_capacity_grants")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createTable("lead_usage_reservations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_usage_reservations_user_status")
    .on("lead_usage_reservations")
    .columns(["user_id", "status"])
    .execute();

  await db.schema
    .createTable("lead_usage_commits")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("reservation_id", "uuid", (col) =>
      col.notNull().references("lead_usage_reservations.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("capacity_requests")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("requested_amount", "integer", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("decision_note", "text")
    .addColumn("reviewer_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("decided_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_capacity_requests_user_status")
    .on("capacity_requests")
    .columns(["user_id", "status"])
    .execute();
}
