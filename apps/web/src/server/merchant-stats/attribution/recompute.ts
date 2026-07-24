import type { Insertable } from "kysely";

import { needsReview } from "~/contracts/merchant-stats/vocabulary";
import type { Database } from "~/lib/db/types";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { chunks } from "../chunks";
import { monthFromStorageDate } from "../storage-month";
import {
  branchOfUser,
  loadAttributionContext,
  rucLeadOf,
  saleEvidenceOf,
  type AttributedSale,
} from "./context";
import { attributeMonth, type SaleEvidence } from "./ladder";

const ATTRIBUTION_CHUNK = 1000;

// Each pair uses two parameters. All sales for a pair stay in the same query.
const PAIR_CHUNK = 1000;

type AttributionInsert = Insertable<Database["merchant_month_attribution"]>;

export interface RucMonth {
  ruc: string;
  month: CalendarMonth;
}

export interface RecomputeResult {
  monthsDerived: number;
  conflicts: number;
  needsReview: number;
}

function monthKey(pair: RucMonth): string {
  return `${pair.ruc}:${pair.month}`;
}

// Recompute from all stored sales, not only the report currently being processed.
// Overrides are stored separately, so this upsert cannot replace human decisions.
//
// A pair with no contributing sales leaves its existing attribution unchanged.
// Any future path that deletes sales must also delete the derived attribution.
export async function recomputeAttribution(
  db: DatabaseExecutor,
  pairs: readonly RucMonth[],
  now: Date,
): Promise<RecomputeResult> {
  if (pairs.length === 0) {
    return {
      monthsDerived: 0,
      conflicts: 0,
      needsReview: 0,
    };
  }

  const sales = await loadContributingSales(db, pairs);
  const ctx = await loadAttributionContext(db, sales);

  const byMonth = new Map<
    string,
    {
      pair: RucMonth;
      sales: SaleEvidence[];
    }
  >();

  for (const sale of sales) {
    const key = monthKey(sale);
    const group = byMonth.get(key);
    const evidence = saleEvidenceOf(ctx, sale);

    if (group) {
      group.sales.push(evidence);
      continue;
    }

    byMonth.set(key, {
      pair: {
        ruc: sale.ruc,
        month: sale.month,
      },
      sales: [evidence],
    });
  }

  const rows: AttributionInsert[] = [];
  let conflicts = 0;
  let needsReviewCount = 0;

  for (const group of byMonth.values()) {
    const verdict = attributeMonth(
      {
        sales: group.sales,
        rucLead: rucLeadOf(ctx, group.pair.ruc),
      },
      (userId) => branchOfUser(ctx, userId),
    );

    rows.push({
      ruc: group.pair.ruc,
      month: calendarMonthStart(group.pair.month),
      organization_id: ctx.orgByRuc.get(group.pair.ruc) ?? null,
      seller_user_id: verdict.sellerUserId,
      branch_id: verdict.branchId,
      method: verdict.method,
      confidence: verdict.confidence,
      evidence: JSON.stringify(verdict.evidence),
      derived_at: now,
    });

    if (verdict.confidence === "conflict") {
      conflicts++;
    }

    if (needsReview(verdict.confidence)) {
      needsReviewCount++;
    }
  }

  await upsertDerived(db, rows);

  return {
    monthsDerived: rows.length,
    conflicts,
    needsReview: needsReviewCount,
  };
}

async function upsertDerived(
  db: DatabaseExecutor,
  rows: readonly AttributionInsert[],
): Promise<void> {
  for (const chunk of chunks(rows, ATTRIBUTION_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_month_attribution")
      .values(chunk)
      .onConflict((oc) =>
        oc.columns(["ruc", "month"]).doUpdateSet((eb) => ({
          organization_id: eb.ref("excluded.organization_id"),
          seller_user_id: eb.ref("excluded.seller_user_id"),
          branch_id: eb.ref("excluded.branch_id"),
          method: eb.ref("excluded.method"),
          confidence: eb.ref("excluded.confidence"),
          evidence: eb.ref("excluded.evidence"),
          derived_at: eb.ref("excluded.derived_at"),
        })),
      )
      .execute();
  }
}

type ContributingSale = AttributedSale & {
  month: CalendarMonth;
};

// Match exact (RUC, month) pairs. Separate RUC and month filters would load
// combinations the caller did not request.
async function loadContributingSales(
  db: DatabaseExecutor,
  pairs: readonly RucMonth[],
): Promise<ContributingSale[]> {
  const sales: ContributingSale[] = [];

  for (const chunk of chunks(pairs, PAIR_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await db
      .selectFrom("merchant_sale_gpv as g")
      .innerJoin("merchant_sales as s", "s.id", "g.sale_id")
      .where((eb) =>
        eb(
          eb.refTuple("s.ruc", "g.realized_month"),
          "in",
          chunk.map((pair) =>
            eb.tuple(pair.ruc, calendarMonthStart(pair.month)),
          ),
        ),
      )
      .select([
        "s.ruc",
        "g.realized_month as month",
        "s.serial_number",
        "s.sold_at",
        "s.culqi_user_name",
      ])
      .execute();

    for (const row of rows) {
      sales.push({
        ruc: row.ruc,
        month: monthFromStorageDate(row.month),
        serialNumber: row.serial_number,
        soldAt: row.sold_at,
        culqiUserName: row.culqi_user_name,
      });
    }
  }

  return sales;
}
