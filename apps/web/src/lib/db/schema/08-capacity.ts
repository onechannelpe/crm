import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("search_capacity_grants")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer", (col) =>
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
    .addColumn("user_id", "integer", (col) =>
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

  await db.schema
    .createTable("lead_capacity_grants")
    .addColumn("id", "varchar(36)", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("reason", "varchar(100)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer", (col) =>
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
    .addColumn("user_id", "integer", (col) =>
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
}
