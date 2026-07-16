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

const ATTRIBUTION_CHUNK_SIZE = 1000;

type AttributionInsert = Insertable<Database["merchant_monthly_attribution"]>;

export interface StampedAttribution {
  conflicts: number;
  needsReview: number;
}

export async function stampAttribution(
  db: DatabaseExecutor,
  ctx: AttributionContext,
  rows: readonly SourceRow[],
  now: Date,
): Promise<StampedAttribution> {
  const attributions: AttributionInsert[] = [];
  let conflicts = 0;
  let needsReviewCount = 0;

  for (const month of groupByRucMonth(ctx, rows).values()) {
    const verdict = attributeMonth(month.sales, (userId) =>
      branchOfUser(ctx, userId),
    );

    attributions.push({
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

    if (verdict.confidence === "conflict") {
      conflicts++;
    }

    if (needsReview(verdict.confidence)) {
      needsReviewCount++;
    }
  }

  for (const chunk of chunks(attributions, ATTRIBUTION_CHUNK_SIZE)) {
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
          // Imports may fill missing credit, but never replace a decision or manual verdict.
          .where("merchant_monthly_attribution.seller_user_id", "is", null)
          .where("merchant_monthly_attribution.resolved_by", "is", null),
      )
      .execute();
  }

  return {
    conflicts,
    needsReview: needsReviewCount,
  };
}

interface RucMonth {
  ruc: string;
  month: string;
  sales: SaleEvidence[];
}

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

      byKey.set(key, {
        ruc: row.ruc,
        month,
        sales: [evidence],
      });
    }
  }

  return byKey;
}
