import type {
  Attainment,
  AttainmentCoverage,
  AttainmentRow,
  BookFilter,
} from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { creditFilter } from "./filter";
import { displayName } from "./names";
import { targetAsOfMonth } from "./target-as-of";

export async function getAttainment(
  db: DatabaseExecutor,
  filter: BookFilter,
  month: string,
): Promise<Attainment> {
  const [sellers, branches, coverage] = await Promise.all([
    sellerRows(db, filter, month),
    branchRows(db, filter, month),
    monthCoverage(db, month),
  ]);

  return { sellers, branches, coverage };
}

async function sellerRows(
  db: DatabaseExecutor,
  filter: BookFilter,
  month: string,
): Promise<AttainmentRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
    .leftJoin("users as u", "u.id", "a.seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where("m.month", "=", month)
    .where((eb) => creditFilter(eb, filter))
    .select((eb) => [
      "a.seller_user_id",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
      eb.fn.sum<number>("m.gpv").as("gpv"),
      eb.fn.sum<number | null>("t.projected_gpv").as("projected_gpv"),
      eb.fn.count<number>("m.ruc").distinct().as("ruc_count"),
      eb.fn.sum<number>("m.device_count").as("device_count"),
    ])
    .groupBy(["a.seller_user_id", "u.names", "u.first_surname", "b.name"])
    .execute();

  return rows
    .map((row) => ({
      id: row.seller_user_id,
      label: displayName(row) ?? "Sin asignar",
      sublabel: row.branch_name,
      gpv: row.gpv ?? 0,
      projectedGpv: row.projected_gpv,
      rucCount: row.ruc_count ?? 0,
      deviceCount: row.device_count ?? 0,
    }))
    .toSorted((a, b) => b.gpv - a.gpv);
}

async function branchRows(
  db: DatabaseExecutor,
  filter: BookFilter,
  month: string,
): Promise<AttainmentRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where("m.month", "=", month)
    .where((eb) => creditFilter(eb, filter))
    .select((eb) => [
      "a.branch_id",
      "b.name as branch_name",
      eb.fn.sum<number>("m.gpv").as("gpv"),
      eb.fn.sum<number | null>("t.projected_gpv").as("projected_gpv"),
      eb.fn.count<number>("m.ruc").distinct().as("ruc_count"),
      eb.fn.sum<number>("m.device_count").as("device_count"),
    ])
    .groupBy(["a.branch_id", "b.name"])
    .execute();

  return rows
    .map((row) => ({
      id: row.branch_id,
      label: row.branch_name ?? "Sin zonal",
      sublabel: null,
      gpv: row.gpv ?? 0,
      projectedGpv: row.projected_gpv,
      rucCount: row.ruc_count ?? 0,
      deviceCount: row.device_count ?? 0,
    }))
    .toSorted((a, b) => b.gpv - a.gpv);
}

async function monthCoverage(
  db: DatabaseExecutor,
  month: string,
): Promise<AttainmentCoverage> {
  const row = await db
    .selectFrom("merchant_monthly_gpv as m")
    .leftJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .where("m.month", "=", month)
    .select((eb) => [
      eb.fn.coalesce(eb.fn.sum<number>("m.gpv"), eb.lit(0)).as("total_gpv"),
      eb.fn
        .coalesce(
          eb.fn.sum<number>(
            eb
              .case()
              .when("a.seller_user_id", "is not", null)
              .then(eb.ref("m.gpv"))
              .else(eb.lit(0))
              .end(),
          ),
          eb.lit(0),
        )
        .as("attributed_gpv"),
    ])
    .executeTakeFirstOrThrow();

  return {
    attributedGpv: row.attributed_gpv,
    totalGpv: row.total_gpv,
  };
}
