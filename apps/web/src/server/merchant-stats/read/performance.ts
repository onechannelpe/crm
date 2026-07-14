import { GPV_MAX_MONTH_OFFSET } from "~/server/merchant-stats/intake/contracts";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  sellerKeyOf,
  type AttainmentRow,
  type CohortFilters,
  type CohortRampSeries,
  type LifecycleSummary,
} from "./contracts";
import { cohortFilter } from "./filters";
import { withLatestMetric } from "./latest-metric";

// A merchant that has not transacted in this long reads as dormant. Chosen to
// be longer than a month so a merchant who simply bills late is not flagged,
// and short enough that a real stall surfaces within one reporting cycle.
const DORMANT_AFTER_DAYS = 30;

// The ramp curve: one line per sale-month cohort, tracking that cohort across
// its own months (m0 = the sale month, m1 the next, ...). This is the only
// honest time axis for this source. A calendar-month axis would silently drop
// every cohort older than four months, because that is all any sale reports.
// See business-stats-plan.txt §4.
export async function getCohortRamp(
  db: DatabaseExecutor,
  filters: CohortFilters,
): Promise<CohortRampSeries[]> {
  const rows = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .where((eb) => cohortFilter(eb, filters))
    .select((eb) => [
      "s.sale_month",
      "lm.month_offset",
      eb.fn.sum("lm.gpv").as("gpv"),
      eb.fn.sum("lm.trx").as("trx"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    .groupBy(["s.sale_month", "lm.month_offset"])
    .orderBy("s.sale_month")
    .orderBy("lm.month_offset")
    .execute();

  // Projected is per RUC, so it is summed over distinct RUCs per cohort rather
  // than over sale rows: a merchant with three devices still has one target.
  const targets = await db
    .selectFrom("merchant_sales as s")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .where((eb) => cohortFilter(eb, filters))
    .select(["s.sale_month", "a.ruc", "a.projected_gpv"])
    .distinct()
    .execute();

  const projectedByCohort = new Map<string, number>();
  for (const row of targets) {
    const current = projectedByCohort.get(row.sale_month) ?? 0;
    projectedByCohort.set(
      row.sale_month,
      current + Number(row.projected_gpv ?? 0),
    );
  }

  const byCohort = new Map<string, CohortRampSeries>();
  for (const row of rows) {
    const series = byCohort.get(row.sale_month) ?? {
      saleMonth: row.sale_month,
      deviceCount: 0,
      projectedGpv: projectedByCohort.get(row.sale_month) ?? 0,
      points: [],
    };
    series.deviceCount = Math.max(series.deviceCount, row.device_count ?? 0);
    series.points.push({
      offset: row.month_offset,
      gpv: Number(row.gpv ?? 0),
      trx: Number(row.trx ?? 0),
    });
    byCohort.set(row.sale_month, series);
  }

  return [...byCohort.values()];
}

// Attainment per real seller at one cohort step. Grouping replaces the seller
// filter: the whole book is ranked at once instead of one name at a time, and
// each row keeps its user id so the UI can link to the record rather than
// making the reader re-pick a filter.
export async function getSellerAttainment(
  db: DatabaseExecutor,
  filters: CohortFilters,
  offset: number,
): Promise<AttainmentRow[]> {
  const actuals = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where("lm.month_offset", "=", offset)
    .where((eb) => cohortFilter(eb, filters))
    .select((eb) => [
      "a.real_seller_user_id as seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
      eb.fn.sum("lm.gpv").as("gpv"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    .groupBy([
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name",
    ])
    .execute();

  // Targets come from distinct RUCs, never from the metric join, so a merchant
  // with several devices or several cohort months counts once.
  const targets = await db
    .selectFrom("merchant_accounts as a")
    .where((eb) => cohortFilter(eb, filters))
    .select(["a.real_seller_user_id", "a.real_seller_label", "a.projected_gpv"])
    .execute();

  const projectedBySeller = new Map<string, number>();
  for (const row of targets) {
    const key = sellerKeyOf(row.real_seller_user_id, row.real_seller_label);
    projectedBySeller.set(
      key,
      (projectedBySeller.get(key) ?? 0) + Number(row.projected_gpv ?? 0),
    );
  }

  const rows: AttainmentRow[] = actuals.map((row) => {
    const key = sellerKeyOf(row.seller_user_id, row.real_seller_label);
    return {
      key,
      label: displayName(row) ?? row.real_seller_label ?? "Sin asignar",
      sublabel: row.branch_name,
      userId: row.seller_user_id,
      gpv: Number(row.gpv ?? 0),
      projectedGpv: projectedBySeller.get(key) ?? 0,
      deviceCount: row.device_count ?? 0,
    };
  });

  return rows.sort((a, b) => b.gpv - a.gpv);
}

// Attainment per zone. The zonal control used to be a filter that showed one
// zone at a time; there are only a handful, so showing them together is both
// shorter to read and strictly more informative.
export async function getBranchAttainment(
  db: DatabaseExecutor,
  filters: CohortFilters,
  offset: number,
): Promise<AttainmentRow[]> {
  const actuals = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where("lm.month_offset", "=", offset)
    .where((eb) => cohortFilter(eb, filters))
    .select((eb) => [
      "a.branch_id",
      "b.name as branch_name",
      eb.fn.sum("lm.gpv").as("gpv"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    .groupBy(["a.branch_id", "b.name"])
    .execute();

  const targets = await db
    .selectFrom("merchant_accounts as a")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where((eb) => cohortFilter(eb, filters))
    .select(["a.branch_id", "a.projected_gpv"])
    .execute();

  const projectedByBranch = new Map<string, number>();
  for (const row of targets) {
    const key = row.branch_id ?? "none";
    projectedByBranch.set(
      key,
      (projectedByBranch.get(key) ?? 0) + Number(row.projected_gpv ?? 0),
    );
  }

  return actuals
    .map((row) => ({
      key: row.branch_id ?? "none",
      label: row.branch_name ?? "Sin zonal",
      sublabel: null,
      userId: null,
      gpv: Number(row.gpv ?? 0),
      projectedGpv: projectedByBranch.get(row.branch_id ?? "none") ?? 0,
      deviceCount: row.device_count ?? 0,
    }))
    .sort((a, b) => b.gpv - a.gpv);
}

// Activation and dormancy, from columns the intake has always written and no
// read path has ever touched: dia_activo and ultima_trx. This is the funnel the
// spreadsheet cannot express, because it has no durable row identity to
// measure a lifecycle against.
export async function getLifecycle(
  db: DatabaseExecutor,
  filters: CohortFilters,
): Promise<LifecycleSummary> {
  const rows = await db
    .selectFrom("merchant_sales as s")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .where((eb) => cohortFilter(eb, filters))
    .select(["s.sold_at", "s.activated_at", "s.last_transaction_at"])
    .execute();

  const dormantCutoff = new Date();
  dormantCutoff.setDate(dormantCutoff.getDate() - DORMANT_AFTER_DAYS);

  const daysToActivate: number[] = [];
  let activatedCount = 0;
  let dormantCount = 0;

  for (const row of rows) {
    if (row.activated_at) {
      activatedCount++;
      daysToActivate.push(dayGap(row.sold_at, row.activated_at));
    }
    // A sale that never transacted is not dormant, it is unactivated; counting
    // it here would double-charge the same row against two different problems.
    if (
      row.last_transaction_at &&
      new Date(row.last_transaction_at) < dormantCutoff
    ) {
      dormantCount++;
    }
  }

  return {
    salesTotal: rows.length,
    activatedCount,
    medianDaysToActivate: median(daysToActivate),
    dormantCount,
    dormantThresholdDays: DORMANT_AFTER_DAYS,
  };
}

export const COHORT_OFFSETS = Array.from(
  { length: GPV_MAX_MONTH_OFFSET + 1 },
  (_, offset) => offset,
);

function dayGap(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / 86_400_000);
}

// Median rather than mean: a handful of merchants activate months late and drag
// an average somewhere no real merchant sits.
function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function displayName(row: {
  names: string | null;
  first_surname: string | null;
}): string | null {
  const full = [row.names, row.first_surname].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : null;
}
