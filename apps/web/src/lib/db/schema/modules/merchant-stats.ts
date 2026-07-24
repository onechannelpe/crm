import { sql, type Kysely } from "kysely";

import { CLAIMABLE_STATES } from "~/lib/job-queue/registry";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("merchant_reports")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("content_sha256", "text", (col) => col.notNull().unique())
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    .addColumn("storage_key", "text", (col) => col.notNull())
    .addColumn("source_filename", "text", (col) => col.notNull())
    .addColumn("uploaded_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("merchant_report_imports")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("report_id", "uuid", (col) =>
      col
        .notNull()
        .unique()
        .references("merchant_reports.id")
        .onDelete("cascade"),
    )
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("rows_total", "integer")
    .addColumn("rows_applied", "integer")
    .addColumn("rows_failed", "integer")
    .addColumn("results_json", "jsonb")
    .addColumn("error_message", "text")
    .addColumn("lease_owner", "text")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_merchant_report_imports_claim")
    .on("merchant_report_imports")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
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
    .addColumn("serial_key", "text", (col) =>
      col.generatedAlwaysAs(sql`coalesce(serial_number, '')`).stored(),
    )
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("sold_at", "date", (col) => col.notNull())
    .addColumn("sale_month", "date", (col) =>
      col.notNull().check(sql`extract(day from sale_month) = 1`),
    )
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

  await db.schema
    .createIndex("idx_merchant_sales_identity")
    .unique()
    .on("merchant_sales")
    .columns(["merchant_id", "product", "serial_key"])
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
    .addColumn("sale_month", "date", (col) =>
      col.notNull().check(sql`extract(day from sale_month) = 1`),
    )
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
    .createTable("merchant_month_attribution")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) =>
      col.notNull().check(sql`extract(day from month) = 1`),
    )
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id"),
    )
    .addColumn("seller_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("method", "text", (col) => col.notNull())
    .addColumn("confidence", "text", (col) => col.notNull())
    .addColumn("evidence", "jsonb", (col) => col.notNull())
    .addColumn("derived_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_month_attribution_pkey", [
      "ruc",
      "month",
    ])
    .execute();

  await db.schema
    .createTable("merchant_month_attribution_override")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) =>
      col.notNull().check(sql`extract(day from month) = 1`),
    )
    .addColumn("seller_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("resolved_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("resolved_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_month_attribution_override_pkey", [
      "ruc",
      "month",
    ])
    .addForeignKeyConstraint(
      "merchant_month_attribution_override_month_fkey",
      ["ruc", "month"],
      "merchant_month_attribution",
      ["ruc", "month"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await sql`
    create view merchant_month_credit as
      select
        d.ruc,
        d.month,
        d.organization_id,
        case when o.ruc is null then d.seller_user_id else o.seller_user_id end as seller_user_id,
        case when o.ruc is null then d.branch_id else o.branch_id end as branch_id,
        case when o.ruc is null then d.method else 'manual' end as method,
        case
          when o.ruc is null then d.confidence
          when o.seller_user_id is null then 'none'
          else 'exact'
        end as confidence,
        d.evidence,
        d.derived_at,
        o.resolved_by,
        o.resolved_at
      from merchant_month_attribution d
      left join merchant_month_attribution_override o
        on o.ruc = d.ruc and o.month = d.month
  `.execute(db);

  await db.schema
    .createTable("merchant_attribution_jobs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) =>
      col.notNull().check(sql`extract(day from month) = 1`),
    )
    .addColumn("queue_state", "text", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("error_message", "text")
    .addColumn("lease_owner", "text")
    .addColumn("attempt_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("claimable_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .addUniqueConstraint("merchant_attribution_jobs_month", ["ruc", "month"])
    .execute();

  await db.schema
    .createIndex("idx_merchant_attribution_jobs_claim")
    .on("merchant_attribution_jobs")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();

  await db.schema
    .createTable("merchant_targets")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("effective_from", "date", (col) =>
      col.notNull().check(sql`extract(day from effective_from) = 1`),
    )
    .addColumn("projected_gpv", "numeric")
    .addColumn("set_by", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("set_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_targets_pkey", ["ruc", "effective_from"])
    .execute();
}
