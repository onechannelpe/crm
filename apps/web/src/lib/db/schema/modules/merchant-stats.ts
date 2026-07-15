import { sql, type Kysely } from "kysely";

// The merchant GPV pipeline.
//
// One dealer file (planning-report__dealer-*.xlsx) is the only input. It carries
// gpv_m0..m3 per device, indexed off the SALE month (anomes_vta): m0 is the sale
// month, m1 the next calendar month, and so on. The business compares a flat
// per-RUC projection against each of those months.
//
// Three kinds of truth, three lifetimes:
//
//   - facts:  what a Culqi snapshot said about a device. Restated by every
//             newer snapshot; the freshest cut wins.
//   - credit: who sold it. Stamped per (ruc, month) and never re-decided once
//             someone holds it, so a rep leaving in July cannot rewrite May.
//   - policy: the projection. Effective-dated per RUC, because the business
//             sets one number per merchant and raising it in July must leave
//             May measured against May's number.
//
// The calendar rollup is a VIEW, not a table. It is sum(gpv) grouped by
// (ruc, realized_month) over facts we already store; materializing it would buy
// a cache and an invalidation bug (a device changing RUC leaves the old key
// holding volume forever) in exchange for ~8ms at 37x current scale.
export async function createTables<T>(db: Kysely<T>): Promise<void> {
  // One row per uploaded snapshot, identified by content rather than by upload:
  // re-uploading the same bytes is a no-op instead of a second snapshot.
  await db.schema
    .createTable("merchant_reports")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("job_id", "uuid", (col) =>
      col.notNull().references("workflow_integration_jobs.id"),
    )
    .addColumn("content_sha256", "text", (col) => col.notNull().unique())
    // The snapshot instant, read from the filename ("..._03_07_26_C2-05_58").
    // A timestamp and not a date: the dealer cuts more than once a day (C1, C2)
    // and cut ordering is what decides which snapshot wins.
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    // The original .xlsx. Keeping the source (rather than the decoder's output)
    // is what makes a decoder fix replayable against history.
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

  // Rows the decoder refused. Only the rejects: a valid row is already in
  // merchant_sales, and the stored .xlsx is the archival copy of everything.
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

  // The device. Culqi-owned facts only: no organization_id and no lead_id.
  // organizations.ruc is UNIQUE, so the org is a join away; caching it here is
  // what used to let a late registration backfill credit onto old sales.
  await db.schema
    .createTable("merchant_sales")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("merchant_id", "text", (col) => col.notNull())
    .addColumn("product", "text", (col) => col.notNull())
    // Null for CULQILINK / CULQIONLINE, which have no physical device.
    .addColumn("serial_number", "text")
    // Mutable: a merchant can re-register under a new RUC. The rollup is a view,
    // so it simply follows; there is no cached key left holding stale volume.
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("sold_at", "date", (col) => col.notNull())
    // First day of anomes_vta; the cohort anchor for gpv_m0..m3. Immutable once
    // gpv rows reference it -- see the composite key below.
    .addColumn("sale_month", "date", (col) => col.notNull())
    .addColumn("trade_name", "text")
    .addColumn("legal_name", "text")
    // cod_vendedor / vendedor: the seller the sale was registered under at Culqi
    // (the "usuario"). Never the real seller -- across 1,324 rows matched
    // against the team's hand-kept column it agreed 0% of the time, and the same
    // usuario maps to different real sellers. It is a reconciliation axis of its
    // own, not evidence. The code is marginally finer than the name (51 vs 50
    // distinct), so both are kept; surfaces group and display by name.
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
      col.notNull().references("merchant_reports.id"),
    )
    .addColumn("last_seen_report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    // The FK target that pins a gpv row to its sale's month. Its only job.
    .addUniqueConstraint("merchant_sales_id_sale_month", ["id", "sale_month"])
    .execute();

  // The durable sale identity. coalesce() because a link product has no serial
  // and NULLs would not collide in a plain unique index.
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
  // The Calidad de datos serial cross-check scans devices that carry a serial.
  await db.schema
    .createIndex("idx_merchant_sales_serial")
    .on("merchant_sales")
    .column("serial_number")
    .where(sql.ref("serial_number"), "is not", null)
    .execute();

  // Current GPV per device per cohort step. One row per (sale, offset): a newer
  // snapshot overwrites in place, so reads never resolve "latest" themselves.
  await db.schema
    .createTable("merchant_sale_gpv")
    .addColumn("sale_id", "uuid", (col) => col.notNull())
    .addColumn("month_offset", "integer", (col) =>
      col.notNull().check(sql`month_offset between 0 and 3`),
    )
    // Copied from the sale and pinned to it by the composite foreign key below,
    // so the pair cannot drift and sale_month cannot be rewritten under a gpv
    // row. The generated column then turns the cohort axis into the calendar
    // axis once, in the schema, instead of in every query that needs a month.
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
    // Denormalized from the report so the upsert can reject a stale snapshot in
    // a single statement, without a join.
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("merchant_reports.id"),
    )
    .addPrimaryKeyConstraint("merchant_sale_gpv_pkey", [
      "sale_id",
      "month_offset",
    ])
    // Two invariants for the price of one: a gpv row cannot claim a sale_month
    // its sale does not have, and an import cannot restate a sale's month while
    // gpv rows hang off it. The database owns this, not a list of column names
    // in the writer.
    .addForeignKeyConstraint(
      "merchant_sale_gpv_sale_month_fkey",
      ["sale_id", "sale_month"],
      "merchant_sales",
      ["id", "sale_month"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  // The calendar axis. Every monthly aggregate filters on this.
  await db.schema
    .createIndex("idx_merchant_sale_gpv_realized_month")
    .on("merchant_sale_gpv")
    .column("realized_month")
    .execute();

  // Realized GPV at the grain a projection is set at. A view: derived from
  // merchant_sale_gpv, so it cannot drift and needs no rebuild on import.
  //
  // Its key doubles as the in-window predicate. A device reports gpv for four
  // months and then stops, so a RUC appears here only while it is still ramping
  // -- which is exactly the population a projection is meant to be measured
  // against. Attainment drives off this view and left-joins the projection, so
  // numerator and denominator cannot describe different populations.
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

  // Who gets credit for a RUC in a month. Stamped when the month is first
  // observed; a later import may fill a month nobody holds (CRM evidence arrives
  // late -- a serial keyed in after the first import should upgrade none to
  // exact) but never takes a month away from someone who already has it.
  //
  // One live lead per organization is enforced by idx_workflow_leads_organization,
  // and across 549 RUCs exactly one had devices sold by different people, so
  // (ruc, month) is the right grain and the rare disagreement is a conflict row.
  await db.schema
    .createTable("merchant_monthly_attribution")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) => col.notNull())
    .addColumn("seller_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("method", "text", (col) => col.notNull())
    .addColumn("confidence", "text", (col) => col.notNull())
    // What each rung found, plus the Culqi usuario: not evidence the ladder may
    // use, but the best hint a human has when resolving the row.
    .addColumn("evidence", "jsonb", (col) => col.notNull())
    .addColumn("resolved_by", "uuid", (col) => col.references("users.id"))
    .addColumn("resolved_at", "timestamptz")
    .addColumn("stamped_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_monthly_attribution_pkey", [
      "ruc",
      "month",
    ])
    .execute();

  // The quality queue reads this: everything needing a human is one predicate.
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

  // PROYECTADO: one flat number per RUC, what its volume should reach in each
  // month it is ramping. Effective-dated rather than stored per month, because
  // the business sets it per merchant -- one row per change instead of twelve a
  // year, and a raise in July leaves May reading May's row.
  //
  // A month reads the newest row at or before it. projected_gpv is nullable so
  // "this merchant has no projection from July" is expressible without deleting
  // the history that June is still measured against; a null row and a row of
  // zero are different claims, and only the first leaves the denominator.
  //
  // No `source` column: the dealer file carries no projection, so a human is the
  // only writer and there is no precedence to arbitrate.
  await db.schema
    .createTable("merchant_targets")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("effective_from", "date", (col) => col.notNull())
    .addColumn("projected_gpv", "numeric")
    .addColumn("set_by", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("set_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_targets_pkey", ["ruc", "effective_from"])
    .execute();
}
