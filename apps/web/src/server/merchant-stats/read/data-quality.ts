import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { DataQualitySummary } from "./contracts";

// Deliberately unfiltered. Every check here counts rows that are missing the
// very enrichment the filters read from, so filtering the checks by that
// enrichment would hide exactly the rows the reader is looking for.
export async function getDataQuality(
  db: DatabaseExecutor,
): Promise<DataQualitySummary> {
  const unmatched = await db
    .selectFrom("merchant_sales")
    .where("organization_id", "is", null)
    .select((eb) => eb.fn.count<number>("ruc").distinct().as("count"))
    .executeTakeFirst();

  const missingSeller = await db
    .selectFrom("merchant_accounts")
    .where("real_seller_user_id", "is", null)
    .where("real_seller_label", "is", null)
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  const missingProjected = await db
    .selectFrom("merchant_accounts")
    .where("projected_gpv", "is", null)
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  const missingBranch = await db
    .selectFrom("merchant_accounts")
    .where("branch_id", "is", null)
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  // Culqi's serial should agree with the one fulfillment keyed in by hand. A
  // disagreement means one of the two is about the wrong device.
  const serialMismatches = await db
    .selectFrom("merchant_sales as s")
    .where("s.lead_id", "is not", null)
    .where("s.serial_number", "is not", null)
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("lead_fulfillment_units as f")
            .innerJoin("lead_fulfillment_orders as fo", "fo.id", "f.order_id")
            .whereRef("fo.lead_id", "=", "s.lead_id")
            .whereRef("f.serial_number", "=", "s.serial_number")
            .select("f.id"),
        ),
      ),
    )
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  return {
    unmatchedRucs: unmatched?.count ?? 0,
    accountsMissingSeller: missingSeller?.count ?? 0,
    accountsMissingProjected: missingProjected?.count ?? 0,
    accountsMissingBranch: missingBranch?.count ?? 0,
    serialMismatches: serialMismatches?.count ?? 0,
  };
}
