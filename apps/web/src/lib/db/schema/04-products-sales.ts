import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
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
    .createTable("inventory_items")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("product_id", "integer", (col) =>
      col.notNull().references("products.id"),
    )
    .addColumn("serial_number", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("sales_records")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("source", "varchar(30)", (col) => col.notNull())
    .addColumn("status", "varchar(40)", (col) => col.notNull())
    .addColumn("executive_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("lead_assignment_id", "integer", (col) =>
      col.references("lead_assignments.id"),
    )
    .addColumn("branch_id", "integer", (col) =>
      col.notNull().references("branches.id"),
    )
    .addColumn("submitted_at", "integer")
    .addColumn("confirmed_at", "integer")
    .addColumn("rejected_at", "integer")
    .addColumn("cancelled_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sales_records_exec_status_time")
    .on("sales_records")
    .columns(["executive_user_id", "status", "updated_at"])
    .execute();

  await db.schema
    .createIndex("idx_sales_records_branch_status_time")
    .on("sales_records")
    .columns(["branch_id", "status", "updated_at"])
    .execute();

  await db.schema
    .createTable("sales_record_client")
    .addColumn("sales_record_id", "integer", (col) =>
      col.primaryKey().references("sales_records.id").onDelete("cascade"),
    )
    .addColumn("ruc", "varchar(20)")
    .addColumn("company_name", "varchar(255)")
    .addColumn("contact_name", "varchar(255)")
    .addColumn("dni", "varchar(20)")
    .addColumn("phones_json", "text", (col) => col.notNull())
    .addColumn("engine_match_id", "varchar(64)")
    .addColumn("completeness_score", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("sales_record_addresses")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("sales_record_id", "integer", (col) =>
      col.notNull().references("sales_records.id").onDelete("cascade"),
    )
    .addColumn("address_type", "varchar(20)", (col) => col.notNull())
    .addColumn("full_text", "text", (col) => col.notNull())
    .addColumn("department", "varchar(100)")
    .addColumn("province", "varchar(100)")
    .addColumn("district", "varchar(100)")
    .addColumn("ubigeo", "varchar(10)")
    .addColumn("latitude", "real")
    .addColumn("longitude", "real")
    .addColumn("is_primary", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sales_record_addresses_record")
    .on("sales_record_addresses")
    .columns(["sales_record_id", "address_type"])
    .execute();

  await db.schema
    .createTable("sales_record_products")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("sales_record_id", "integer", (col) =>
      col.notNull().references("sales_records.id").onDelete("cascade"),
    )
    .addColumn("product_id", "integer", (col) =>
      col.notNull().references("products.id"),
    )
    .addColumn("product_name_snapshot", "varchar(255)", (col) => col.notNull())
    .addColumn("category_snapshot", "varchar(100)", (col) => col.notNull())
    .addColumn("subtype_snapshot", "varchar(100)")
    .addColumn("quantity", "integer", (col) => col.notNull())
    .addColumn("unit_price_snapshot", "real")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sales_record_products_record")
    .on("sales_record_products")
    .columns(["sales_record_id", "product_id"])
    .execute();

  await db.schema
    .createTable("sales_record_attempts")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("sales_record_id", "integer", (col) =>
      col.notNull().references("sales_records.id").onDelete("cascade"),
    )
    .addColumn("reviewer_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("outcome", "varchar(40)", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("next_attempt_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sales_record_attempts_record_time")
    .on("sales_record_attempts")
    .columns(["sales_record_id", "created_at"])
    .execute();
}
