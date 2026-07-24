import { sql, type Kysely } from "kysely";

import type { Json } from "~/contracts/json";
import { CLAIMABLE_STATES } from "~/lib/job-queue/registry";

import type { Database } from "../../types";

export async function createTables(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("merchant_gpv_dataset")
    .addColumn("id", "text", (col) =>
      col.primaryKey().check(sql`id = 'default'`),
    )
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db
    .insertInto("merchant_gpv_dataset")
    .values({ id: "default", updated_at: new Date(0) })
    .execute();

  await db.schema
    .createTable("gpv_snapshots")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().unique().references("file_assets.id"),
    )
    .addColumn("cut_at", "timestamptz", (col) => col.notNull())
    .addColumn("revision", "integer", (col) =>
      col.notNull().check(sql`revision > 0`),
    )
    .addColumn("state", "text", (col) =>
      col
        .notNull()
        .defaultTo("queued")
        .check(
          sql`state in ('queued', 'processing', 'needs_review', 'ready', 'active', 'superseded', 'rejected', 'failed')`,
        ),
    )
    .addColumn("uploaded_at", "timestamptz", (col) => col.notNull())
    .addColumn("activated_by", "uuid", (col) => col.references("users.id"))
    .addColumn("activated_at", "timestamptz")
    .addCheckConstraint(
      "gpv_snapshot_activation_fields",
      sql`(
        state in ('active', 'superseded')
        and activated_by is not null
        and activated_at is not null
      ) or (
        state not in ('active', 'superseded')
        and activated_by is null
        and activated_at is null
      )`,
    )
    .addUniqueConstraint("gpv_snapshots_cut_revision", ["cut_at", "revision"])
    .execute();

  await db.schema
    .createIndex("idx_gpv_snapshots_one_active")
    .on("gpv_snapshots")
    .column("state")
    .unique()
    .where("state", "=", "active")
    .execute();

  await db.schema
    .createTable("gpv_snapshot_jobs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("snapshot_id", "uuid", (col) =>
      col.notNull().unique().references("gpv_snapshots.id").onDelete("cascade"),
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
    .createIndex("idx_gpv_snapshot_jobs_claim")
    .on("gpv_snapshot_jobs")
    .column("claimable_at")
    .where(CLAIMABLE_STATES)
    .execute();

  await db.schema
    .createTable("gpv_snapshot_placements")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("snapshot_id", "uuid", (col) =>
      col.notNull().references("gpv_snapshots.id").onDelete("cascade"),
    )
    .addColumn("row_number", "integer", (col) => col.notNull())
    .addColumn("placement_key", "text", (col) => col.notNull())
    .addColumn("merchant_id", "text", (col) => col.notNull())
    .addColumn("product", "text", (col) => col.notNull())
    .addColumn("serial_number", "text")
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
    .addColumn("raw", "jsonb", (col) => col.notNull())
    .addUniqueConstraint("gpv_snapshot_placements_identity", [
      "snapshot_id",
      "placement_key",
    ])
    .addUniqueConstraint("gpv_snapshot_placements_id_snapshot", [
      "id",
      "snapshot_id",
    ])
    .execute();

  await db.schema
    .createIndex("idx_gpv_snapshot_placements_ruc")
    .on("gpv_snapshot_placements")
    .columns(["snapshot_id", "ruc"])
    .execute();

  await db.schema
    .createTable("gpv_snapshot_observations")
    .addColumn("snapshot_id", "uuid", (col) =>
      col.notNull().references("gpv_snapshots.id").onDelete("cascade"),
    )
    .addColumn("placement_id", "uuid", (col) => col.notNull())
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
    .addPrimaryKeyConstraint("gpv_snapshot_observations_pkey", [
      "snapshot_id",
      "placement_id",
      "month_offset",
    ])
    .addForeignKeyConstraint(
      "gpv_snapshot_observations_placement",
      ["placement_id", "snapshot_id"],
      "gpv_snapshot_placements",
      ["id", "snapshot_id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createIndex("idx_gpv_snapshot_observations_month")
    .on("gpv_snapshot_observations")
    .columns(["snapshot_id", "realized_month"])
    .execute();

  await db.schema
    .createTable("gpv_snapshot_issues")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("snapshot_id", "uuid", (col) =>
      col.notNull().references("gpv_snapshots.id").onDelete("cascade"),
    )
    .addColumn("issue_key", "text", (col) => col.notNull())
    .addColumn("issue_type", "text", (col) => col.notNull())
    .addColumn("entity_key", "text")
    .addColumn("severity", "text", (col) =>
      col.notNull().check(sql`severity in ('warning', 'blocking')`),
    )
    .addColumn("status", "text", (col) =>
      col
        .notNull()
        .defaultTo("open")
        .check(sql`status in ('open', 'resolved')`),
    )
    .addColumn("detail", "text", (col) => col.notNull())
    .addColumn("previous_value", "jsonb")
    .addColumn("candidate_value", "jsonb")
    .addColumn("resolution", "text", (col) =>
      col.check(
        sql`resolution in ('accept_candidate', 'keep_previous', 'exclude_candidate', 'reject_snapshot')`,
      ),
    )
    .addColumn("resolved_by", "uuid", (col) => col.references("users.id"))
    .addColumn("resolved_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addUniqueConstraint("gpv_snapshot_issues_key", [
      "snapshot_id",
      "issue_key",
    ])
    .addCheckConstraint(
      "gpv_snapshot_issue_resolution_fields",
      sql`(
        status = 'open'
        and resolution is null
        and resolved_by is null
        and resolved_at is null
      ) or (
        status = 'resolved'
        and resolution is not null
        and resolved_by is not null
        and resolved_at is not null
      )`,
    )
    .execute();

  await db.schema
    .createTable("merchant_month_credits")
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) =>
      col.notNull().check(sql`extract(day from month) = 1`),
    )
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id"),
    )
    .addColumn("seller_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("first_snapshot_id", "uuid", (col) =>
      col.notNull().references("gpv_snapshots.id"),
    )
    .addColumn("credited_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_month_credits_pkey", ["ruc", "month"])
    .execute();

  await db.schema
    .createTable("merchant_month_credit_adjustments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("ruc", "text", (col) => col.notNull())
    .addColumn("month", "date", (col) =>
      col.notNull().check(sql`extract(day from month) = 1`),
    )
    .addColumn("seller_user_id", "uuid", (col) => col.references("users.id"))
    .addColumn("branch_id", "uuid", (col) => col.references("branches.id"))
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("adjusted_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("adjusted_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_merchant_month_credit_adjustments_latest")
    .on("merchant_month_credit_adjustments")
    .columns(["ruc", "month", "adjusted_at"])
    .execute();

  await db.schema
    .createTable("merchant_gpv_targets")
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("effective_from", "date", (col) =>
      col.notNull().check(sql`extract(day from effective_from) = 1`),
    )
    .addColumn("monthly_target_gpv", "numeric", (col) =>
      col.check(sql`monthly_target_gpv is null or monthly_target_gpv >= 0`),
    )
    .addColumn("set_by", "uuid", (col) => col.notNull().references("users.id"))
    .addColumn("set_at", "timestamptz", (col) => col.notNull())
    .addPrimaryKeyConstraint("merchant_gpv_targets_pkey", [
      "organization_id",
      "effective_from",
    ])
    .execute();

  await createServingViews(db);
}

async function createServingViews(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createView("merchant_sales")
    .as(
      db
        .selectFrom("gpv_snapshots as snapshot")
        .innerJoin(
          "gpv_snapshot_placements as placement",
          "placement.snapshot_id",
          "snapshot.id",
        )
        .select([
          "placement.id",
          "placement.merchant_id",
          "placement.product",
          "placement.serial_number",
          "placement.ruc",
          "placement.sold_at",
          "placement.sale_month",
          "placement.trade_name",
          "placement.legal_name",
          "placement.culqi_user_code",
          "placement.culqi_user_name",
          "placement.mesa",
          "placement.channel",
          "placement.subchannel",
          "placement.offer_amount",
          "placement.promotion",
          "placement.client_type",
          "placement.stock_type",
          "placement.trial_at",
          "placement.activated_at",
          "placement.last_transaction_at",
          "placement.m0_plus_15d_gpv",
          "placement.m0_plus_15d_trx",
        ])
        .where("snapshot.state", "=", "active"),
    )
    .execute();

  await db.schema
    .createView("merchant_sale_gpv")
    .as(
      db
        .selectFrom("gpv_snapshots as snapshot")
        .innerJoin(
          "gpv_snapshot_observations as observation",
          "observation.snapshot_id",
          "snapshot.id",
        )
        .select([
          "observation.placement_id as sale_id",
          "observation.month_offset",
          "observation.sale_month",
          "observation.realized_month",
          "observation.gpv",
          "observation.trx",
        ])
        .where("snapshot.state", "=", "active"),
    )
    .execute();

  await db.schema
    .createView("merchant_monthly_gpv")
    .as(
      db
        .selectFrom("gpv_snapshots as snapshot")
        .innerJoin(
          "gpv_snapshot_placements as placement",
          "placement.snapshot_id",
          "snapshot.id",
        )
        .innerJoin("gpv_snapshot_observations as observation", (join) =>
          join
            .onRef("observation.snapshot_id", "=", "placement.snapshot_id")
            .onRef("observation.placement_id", "=", "placement.id"),
        )
        .select((eb) => [
          "placement.ruc",
          "observation.realized_month as month",
          eb.fn.sum<number>("observation.gpv").as("gpv"),
          eb.fn.sum<number>("observation.trx").as("trx"),
          eb.fn.count<number>("placement.id").distinct().as("device_count"),
        ])
        .where("snapshot.state", "=", "active")
        .groupBy(["placement.ruc", "observation.realized_month"]),
    )
    .execute();

  await db.schema
    .createView("merchant_month_credit")
    .as(
      db
        .selectFrom("merchant_month_credits as credit")
        .leftJoinLateral(
          (eb) =>
            eb
              .selectFrom("merchant_month_credit_adjustments as adjustment")
              .selectAll("adjustment")
              .whereRef("adjustment.ruc", "=", "credit.ruc")
              .whereRef("adjustment.month", "=", "credit.month")
              .orderBy("adjustment.adjusted_at", "desc")
              .orderBy("adjustment.id", "desc")
              .limit(1)
              .as("adjustment"),
          (join) => join.onTrue(),
        )
        .select((eb) => [
          "credit.ruc",
          "credit.month",
          "credit.organization_id",
          eb
            .case()
            .when("adjustment.id", "is", null)
            .then(eb.ref("credit.seller_user_id"))
            .else(eb.ref("adjustment.seller_user_id"))
            .end()
            .as("seller_user_id"),
          eb
            .case()
            .when("adjustment.id", "is", null)
            .then(eb.ref("credit.branch_id"))
            .else(eb.ref("adjustment.branch_id"))
            .end()
            .as("branch_id"),
          eb
            .case()
            .when("adjustment.id", "is", null)
            .then(eb.val("crm_owner"))
            .else(eb.val("manual"))
            .end()
            .as("method"),
          eb
            .case()
            .when("adjustment.id", "is", null)
            .then(eb.val("exact"))
            .when("adjustment.seller_user_id", "is", null)
            .then(eb.val("none"))
            .else(eb.val("exact"))
            .end()
            .as("confidence"),
          eb
            .fn<Json>("jsonb_build_object", [
              eb.val("firstSnapshotId"),
              "credit.first_snapshot_id",
            ])
            .as("evidence"),
          "credit.credited_at as derived_at",
          "adjustment.adjusted_by as resolved_by",
          "adjustment.adjusted_at as resolved_at",
        ]),
    )
    .execute();
}
