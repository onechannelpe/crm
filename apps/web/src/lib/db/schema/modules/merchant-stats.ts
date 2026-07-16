import { sql, type Kysely } from "kysely";

// Dealer snapshots provide device facts. Attribution decisions are preserved per
// RUC-month, targets are effective-dated, and monthly GPV follows RUC changes.
export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("merchant_reports")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("job_id", "uuid", (col) =>
      col.notNull().references("workflow_integration_jobs.id"),
    )
    .addColumn("content_sha256", "text", (col) => col.notNull().unique())
    // The filename includes a time because the dealer can issue multiple cuts daily.
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    .addColumn("storage_key", "text", (col) => col.notNull())
    .addColumn("source_filename", "text", (col) => col.notNull())
    .addColumn("uploaded_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("rows_total", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("rows_valid", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("rows_rejected", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("merchant_report_rejections")
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id").onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("ruc", "text")
    .addColumn("merchant_id", "text")
    .addColumn("serial_number", "text")
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("raw", "jsonb", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_report_rejections_pkey", [
      "report_id",
      "row_number",
    ])
    .execute();

  await db.schema
    .createTable("merchant_sales")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("merchant_id", "text", (col) => col.notNull())
    .addColumn("product", "text", (col) => col.notNull())
    .addColumn("serial_number", "text")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("sold_at", "date", (col) => col.notNull())
    .addColumn("sale_month", "date", (col) => col.notNull())
    .addColumn("trade_name", "text")
    .addColumn("legal_name", "text")
    .addColumn("culqi_user_code", "text")
    .addColumn("culqi_user_name", "text")
    .addColumn("mesa", "text")
    .addColumn("channel", "text")
    .addColumn("subchannel", "text")
    .addColumn("offer_amount", "numeric")
    .addColumn("promotion", "text")
    .addColumn("client_type", "text")
    .addColumn("stock_type", "text")
    .addColumn("trial_at", "date")
    .addColumn("activated_at", "date")
    .addColumn("last_transaction_at", "date")
    .addColumn("m0_plus_15d_gpv", "numeric")
    .addColumn("m0_plus_15d_trx", "integer")
    .addColumn("first_seen_report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id"),
    )
    .addColumn("last_seen_report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addUniqueConstraint("merchant_sales_id_sale_month", ["id", "sale_month"])
    .execute();

  // Link and online sales lack a serial. Coalescing makes their identities unique.
  await sql`
    create unique index idx_merchant_sales_identity
      on merchant_sales (merchant_id, product, coalesce(serial_number, ''))
  `.execute(db);

  await db.schema
    .createIndex("idx_merchant_sales_ruc")
    .on("merchant_sales")
    .column("ruc")
    .execute();
  await db.schema
    .createIndex("idx_merchant_sales_sale_month")
    .on("merchant_sales")
    .column("sale_month")
    .execute();
  await db.schema
    .createIndex("idx_merchant_sales_serial")
    .on("merchant_sales")
    .column("serial_number")
    .where(sql.ref("serial_number"), "is not", null)
    .execute();

  await db.schema
    .createTable("merchant_sale_gpv")
    .addColumn("sale_id", "uuid", (col) => col.notNull())
    .addColumn("month_offset", "integer", (col) =>
      col.notNull().check(sql`month_offset between 0 and 3`),
    )
    .addColumn("sale_month", "date", (col) => col.notNull())
    .addColumn("realized_month", "date", (col) =>
      col
        .generatedAlwaysAs(
          sql`(sale_month + make_interval(months => month_offset))::date`,
        )
        .stored(),
    )
    .addColumn("gpv", "numeric", (col) => col.notNull())
    .addColumn("trx", "integer", (col) => col.notNull())
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id"),
    )
    .addPrimaryKeyConstraint("merchant_sale_gpv_pkey", [
      "sale_id",
      "month_offset",
    ])
    // Prevent a GPV row from claiming a different sale month than its sale.
    .addForeignKeyConstraint(
      "merchant_sale_gpv_sale_month_fkey",
      ["sale_id", "sale_month"],
      "merchant_sales",
      ["id", "sale_month"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createIndex("idx_merchant_sale_gpv_realized_month")
    .on("merchant_sale_gpv")
    .column("realized_month")
    .execute();

  await sql`
    create view merchant_monthly_gpv as
      select
        s.ruc,
        g.realized_month as month,
        sum(g.gpv) as gpv,
        sum(g.trx) as trx,
        count(distinct s.id) as device_count
      from merchant_sale_gpv g
      join merchant_sales s on s.id = g.sale_id
      group by s.ruc, g.realized_month
  `.execute(db);

  await db.schema
    .createTable("merchant_monthly_attribution")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) => col.notNull())
    .addColumn("seller_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("method", "text", (col) => col.notNull())
    .addColumn("confidence", "text", (col) => col.notNull())
    .addColumn("evidence", "jsonb", (col) => col.notNull())
    .addColumn("resolved_by", "uuid", (col) => col.references("users.id"))
    .addColumn("resolved_at", "timestamptz")
    .addColumn("stamped_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_monthly_attribution_pkey", [
      "ruc",
      "month",
    ])
    .execute();

  await db.schema
    .createIndex("idx_merchant_monthly_attribution_confidence")
    .on("merchant_monthly_attribution")
    .column("confidence")
    .execute();
  await db.schema
    .createIndex("idx_merchant_monthly_attribution_seller")
    .on("merchant_monthly_attribution")
    .column("seller_user_id")
    .execute();
  await db.schema
    .createIndex("idx_merchant_monthly_attribution_branch")
    .on("merchant_monthly_attribution")
    .column("branch_id")
    .execute();

  await db.schema
    .createTable("merchant_targets")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("effective_from", "date", (col) => col.notNull())
    // Null means no projection from effective_from onward; zero remains a target.
    .addColumn("projected_gpv", "numeric")
    .addColumn("set_by", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("set_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_targets_pkey", ["ruc", "effective_from"])
    .execute();
}
