import type { Insertable } from "kysely";

import { needsReview } from "~/contracts/merchant-stats/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  branchOfUser,
  saleEvidenceOf,
  type AttributionContext,
} from "../attribution/context";
import { attributeMonth, type SaleEvidence } from "../attribution/ladder";
import { addMonths } from "../intake/cells";
import type { SourceRow } from "../intake/types";
import { chunks } from "./chunks";

const ATTRIBUTION_CHUNK = 1000;

// The insert shape, taken from the table rather than restated, so a schema
// change surfaces here instead of at the call site.
type AttributionValues = Insertable<Database["merchant_monthly_attribution"]>;

export interface StampedAttribution {
  conflicts: number;
  needsReview: number;
}

// Stamps credit for every (ruc, month) the report realizes.
//
// Immutability rule: a month that already credits someone is never re-decided by
// an import. That is what stops a rep leaving in July from rewriting May.
//
// A month with NO seller is a different case. It is an absence, not a decision,
// and filling it in is not a rewrite. The CRM's own evidence arrives on its own
// schedule -- a serial keyed into fulfillment after the first import should be
// able to turn `none` into `exact` on the next one. The guard stays narrow:
// never touch a row a human resolved, never touch a row that already credits
// someone.
export async function stampAttribution(
  db: DatabaseExecutor,
  ctx: AttributionContext,
  rows: readonly SourceRow[],
  now: Date,
): Promise<StampedAttribution> {
  const values: AttributionValues[] = [];
  let conflicts = 0;
  let review = 0;

  for (const [, month] of groupByRucMonth(ctx, rows)) {
    const verdict = attributeMonth(month.sales, (userId) =>
      branchOfUser(ctx, userId),
    );

    values.push({
      ruc: month.ruc,
      month: month.month,
      seller_user_id: verdict.sellerUserId,
      branch_id: verdict.branchId,
      method: verdict.method,
      confidence: verdict.confidence,
      evidence: JSON.stringify(verdict.evidence),
      resolved_by: null,
      resolved_at: null,
      stamped_at: now,
    });

    if (verdict.confidence === "conflict") conflicts++;
    if (needsReview(verdict.confidence)) review++;
  }

  for (const chunk of chunks(values, ATTRIBUTION_CHUNK)) {
    // One transaction, one connection: awaiting here is not a cost, it is the
    // only option.
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_monthly_attribution")
      .values(chunk)
      .onConflict((oc) =>
        oc
          .columns(["ruc", "month"])
          .doUpdateSet((eb) => ({
            seller_user_id: eb.ref("excluded.seller_user_id"),
            branch_id: eb.ref("excluded.branch_id"),
            method: eb.ref("excluded.method"),
            confidence: eb.ref("excluded.confidence"),
            evidence: eb.ref("excluded.evidence"),
            stamped_at: eb.ref("excluded.stamped_at"),
          }))
          // Only an uncredited month nobody has ruled on.
          .where("merchant_monthly_attribution.seller_user_id", "is", null)
          .where("merchant_monthly_attribution.resolved_by", "is", null),
      )
      .execute();
  }

  return { conflicts, needsReview: review };
}

interface RucMonth {
  ruc: string;
  month: string;
  sales: SaleEvidence[];
}

// A RUC-month is decided from every device whose volume lands in it, so the
// grouping is the grain. A device contributes its evidence to each of the four
// months it reports.
function groupByRucMonth(
  ctx: AttributionContext,
  rows: readonly SourceRow[],
): Map<string, RucMonth> {
  const byKey = new Map<string, RucMonth>();

  for (const row of rows) {
    const evidence = saleEvidenceOf(ctx, row);
    for (const observation of row.gpv) {
      const month = addMonths(row.saleMonth, observation.offset);
      const key = `${row.ruc}:${month}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.sales.push(evidence);
        continue;
      }
      byKey.set(key, { ruc: row.ruc, month, sales: [evidence] });
    }
  }

  return byKey;
}
