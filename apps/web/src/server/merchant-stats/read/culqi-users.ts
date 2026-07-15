import type {
  BookFilter,
  CulqiUserGpvRow,
} from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

// GPV by Culqi's own usuario (the `vendedor` column), for one calendar month.
//
// This is a reconciliation view, not a leaderboard. The usuario is who the sale
// was registered under at Culqi, and it is NOT the seller: matched against the
// team's hand-kept real-seller column across 1,324 rows it agreed 0% of the
// time, and the same usuario maps to different real people. Ranking reps by this
// would be actively wrong. It exists so the book can be squared against Culqi's
// own reporting.
//
// Sale grain, deliberately. A RUC's devices can carry different usuarios, so
// this cannot fold into the (ruc, month) credit table -- it is a second axis
// over the same facts, not a second opinion on the same key.
export async function getCulqiUserGpv(
  db: DatabaseExecutor,
  filter: BookFilter,
  month: string,
): Promise<CulqiUserGpvRow[]> {
  const rows = await db
    .selectFrom("merchant_sale_gpv as g")
    .innerJoin("merchant_sales as s", "s.id", "g.sale_id")
    .where("g.realized_month", "=", month)
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select((eb) => [
      "s.culqi_user_name",
      eb.fn.sum<number>("g.gpv").as("gpv"),
      eb.fn.sum<number>("g.trx").as("trx"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    // By name, not by code: the business reads names, and the code is opaque.
    // The code is marginally finer (51 codes to 50 names in the sample), so a
    // name covering two codes merges here -- visible as one row, which is the
    // reconciliation question anyway.
    .groupBy("s.culqi_user_name")
    .execute();

  return rows
    .map((row) => ({
      culqiUserName: row.culqi_user_name,
      gpv: row.gpv ?? 0,
      trx: row.trx ?? 0,
      deviceCount: row.device_count ?? 0,
    }))
    .toSorted((a, b) => b.gpv - a.gpv);
}
