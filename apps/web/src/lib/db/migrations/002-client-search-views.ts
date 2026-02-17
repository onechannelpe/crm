import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("client_search_views")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("name", "varchar(120)", (col) => col.notNull())
    .addColumn("search_type", "varchar(40)", (col) => col.notNull())
    .addColumn("query_value", "varchar(255)", (col) => col.notNull())
    .addColumn("limit_value", "integer", (col) => col.notNull().defaultTo(20))
    .addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_client_search_views_user_created")
    .on("client_search_views")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_client_search_views_user_name")
    .on("client_search_views")
    .columns(["user_id", "name"])
    .unique()
    .execute();
}
