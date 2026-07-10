import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("lead_fulfillment_orders")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("lead_id", "text", (col) =>
      col
        .notNull()
        .unique()
        .references("workflow_leads.id")
        .onDelete("cascade"),
    )
    .addColumn("product_kind", "text")
    .addColumn("current_step", "text", (col) => col.notNull())
    .addColumn("service_b_ref", "text")
    .addColumn("created_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  // The work-queue and detail reads filter live orders by their pending step.
  await db.schema
    .createIndex("idx_lead_fulfillment_orders_step")
    .on("lead_fulfillment_orders")
    .column("current_step")
    .execute();

  await db.schema
    .createTable("lead_fulfillment_units")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("order_id", "uuid", (col) =>
      col
        .notNull()
        .references("lead_fulfillment_orders.id")
        .onDelete("cascade"),
    )
    .addColumn("venue_id", "text", (col) =>
      col.references("workflow_lead_venues.id"),
    )
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("serial_number", "text")
    .addColumn("payment_url", "text")
    .addColumn("payment_proof_file_asset_id", "uuid", (col) =>
      col.references("file_assets.id"),
    )
    .addColumn("payment_validated", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("service_a_ref", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_fulfillment_units_order")
    .on("lead_fulfillment_units")
    .column("order_id")
    .execute();

  await db.schema
    .createTable("lead_fulfillment_documents")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("order_id", "uuid", (col) =>
      col
        .notNull()
        .references("lead_fulfillment_orders.id")
        .onDelete("cascade"),
    )
    .addColumn("doc_kind", "text", (col) => col.notNull())
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().unique().references("file_assets.id").onDelete("cascade"),
    )
    .addColumn("uploaded_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_lead_fulfillment_documents_order")
    .on("lead_fulfillment_documents")
    .column("order_id")
    .execute();
}
