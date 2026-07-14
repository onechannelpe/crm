import { sql, type Kysely } from "kysely";

// Per-RUC enrichment (real seller, zone, projected target) lives in
// merchant_accounts and is never touched by a reimport.
//
// gpv_m0..m3 are indexed off the SALE month (añomes_vta), not the snapshot
// date. m0 is the sale month, m1 the next calendar month, and so on. The cut
// date only tells us which snapshot is freshest.
export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // One row per uploaded snapshot. cut_date (max ultima_trx) orders snapshots
  // so the latest wins per month.
  await db.schema
    .createTable("merchant_sales_reports")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("job_id", "uuid", (col) =>
      col.notNull().references("workflow_integration_jobs.id"),
    )
    .addColumn("cut_date", "date", (col) => col.notNull())
    .addColumn("source_filename", "text", (col) => col.notNull())
    .addColumn("uploaded_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("rows_total", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("rows_matched", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("rows_unmatched", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_merchant_sales_reports_cut_date")
    .on("merchant_sales_reports")
    .column("cut_date")
    .execute();

  // Durable sale: Culqi-owned facts, refreshed on reimport. Enrichment lives
  // in merchant_accounts.
  await db.schema
    .createTable("merchant_sales")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("merchant_id", "text", (col) => col.notNull())
    // Null for CULQILINK / CULQIONLINE, which have no physical device.
    .addColumn("serial_number", "text")
    .addColumn("ruc", "text", (col) => col.notNull())
    // Null when the dealer sold to a merchant the CRM never registered.
    // Kept as a lead-gen list.
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id"),
    )
    .addColumn("lead_id", "text", (col) => col.references("workflow_leads.id"))
    .addColumn("product", "text", (col) => col.notNull())
    .addColumn("sold_at", "date", (col) => col.notNull())
    // First day of añomes_vta; the cohort anchor for gpv_m0..m3.
    .addColumn("sale_month", "date", (col) => col.notNull())
    .addColumn("trade_name", "text")
    .addColumn("legal_name", "text")
    // cod_vendedor / vendedor: the seller the sale was registered under at
    // Culqi, which the business team calls the "usuario". Kept as reference;
    // NOT the real seller, which they track per RUC in merchant_accounts.
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
    // Cumulative, sale month + first 15d of m1. Overlaps m0, so it stays a
    // column on the sale rather than a row on the m0..m3 axis.
    .addColumn("m0_plus_15d_gpv", "numeric")
    .addColumn("m0_plus_15d_trx", "integer")
    .addColumn("first_seen_report_id", "uuid", (col) =>
      col.notNull().references("merchant_sales_reports.id"),
    )
    .addColumn("last_seen_report_id", "uuid", (col) =>
      col.notNull().references("merchant_sales_reports.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  // Durable identity of a sale across weekly snapshots. serial_number alone is
  // not unique (a device can be re-registered under another merchant), and it
  // is null for LINK/ONLINE; product disambiguates a merchant that holds both
  // a link and an online checkout. coalesce keeps the null serials from
  // comparing distinct under the unique index.
  await sql`
    create unique index idx_merchant_sales_identity
    on merchant_sales (merchant_id, product, coalesce(serial_number, ''))
  `.execute(db);

  await db.schema
    .createIndex("idx_merchant_sales_organization")
    .on("merchant_sales")
    .column("organization_id")
    .execute();
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
    .createIndex("idx_merchant_sales_lead")
    .on("merchant_sales")
    .column("lead_id")
    .execute();

  // Per-RUC enrichment. Seeded once, edited in-app, never overwritten by a
  // reimport. Real seller and projected target are constant within a RUC
  // across the source file.
  await db.schema
    .createTable("merchant_accounts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("ruc", "text", (col) => col.notNull().unique())
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id"),
    )
    // The real seller (VENDEDOR R). Points at a CRM user when the name
    // resolves; otherwise kept as free text ("EMPRESA", unmatched names).
    .addColumn("real_seller_user_id", "uuid", (col) =>
      col.references("users.id"),
    )
    .addColumn("real_seller_label", "text")
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    // PROYECTADO: a flat monthly GPV target per RUC. Each month's realized GPV
    // is compared against it.
    .addColumn("projected_gpv", "numeric")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_merchant_accounts_organization")
    .on("merchant_accounts")
    .column("organization_id")
    .execute();
  await db.schema
    .createIndex("idx_merchant_accounts_real_seller")
    .on("merchant_accounts")
    .column("real_seller_user_id")
    .execute();
  await db.schema
    .createIndex("idx_merchant_accounts_branch")
    .on("merchant_accounts")
    .column("branch_id")
    .execute();

  // Append-only monthly facts. One row per (snapshot, sale, month). Current
  // truth for a month is the row from the latest report (max cut_date) that
  // carries it.
  await db.schema
    .createTable("merchant_sale_metrics")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("merchant_sales_reports.id").onDelete("cascade"),
    )
    .addColumn("merchant_sale_id", "uuid", (col) =>
      col.notNull().references("merchant_sales.id").onDelete("cascade"),
    )
    .addColumn("month", "date", (col) => col.notNull())
    // 0..3 (m0..m3). Denormalized from month - sale_month so the cohort grid
    // (M0/M1/M2/M3 columns) needs no per-row month arithmetic.
    .addColumn("month_offset", "integer", (col) => col.notNull())
    .addColumn("gpv", "numeric", (col) => col.notNull())
    .addColumn("trx", "integer", (col) => col.notNull())
    .addUniqueConstraint("idx_merchant_sale_metrics_unique", [
      "report_id",
      "merchant_sale_id",
      "month",
    ])
    .execute();

  await db.schema
    .createIndex("idx_merchant_sale_metrics_sale_month")
    .on("merchant_sale_metrics")
    .columns(["merchant_sale_id", "month"])
    .execute();

  // raw_row keeps the unmodeled source columns. Promote one to a typed column
  // only when a dashboard needs it.
  await db.schema
    .createTable("merchant_sales_import_rows")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("merchant_sales_reports.id").onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("merchant_id", "text")
    .addColumn("serial_number", "text")
    .addColumn("state", "text", (col) => col.notNull())
    .addColumn("merchant_sale_id", "uuid", (col) =>
      col.references("merchant_sales.id").onDelete("set null"),
    )
    .addColumn("failure_reason", "text")
    .addColumn("raw_row", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addUniqueConstraint("idx_merchant_sales_import_rows_unique", [
      "report_id",
      "row_number",
    ])
    .execute();
}
