import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface AdjustMerchantMonthCreditInput {
  ruc: string;
  month: CalendarMonth;
  sellerUserId: UserId | null;
  reason: string;
  adjustedBy: UserId;
  now: Date;
}

export async function adjustMerchantMonthCredit(
  db: DatabaseExecutor,
  input: AdjustMerchantMonthCreditInput,
): Promise<Result<void, DomainError>> {
  if (db.isTransaction) {
    return adjustInTransaction(db, input);
  }

  return db.transaction().execute((tx) => adjustInTransaction(tx, input));
}

async function adjustInTransaction(
  db: DatabaseExecutor,
  input: AdjustMerchantMonthCreditInput,
): Promise<Result<void, DomainError>> {
  const month = calendarMonthStart(input.month);
  const ruc = input.ruc.trim();
  const seller = input.sellerUserId
    ? await db
        .selectFrom("users")
        .select("branch_id")
        .where("id", "=", input.sellerUserId)
        .executeTakeFirst()
    : null;

  if (input.sellerUserId && !seller) {
    return Err(fail("invalid_executive"));
  }

  const credit = await db
    .selectFrom("merchant_month_credits")
    .select("ruc")
    .where("ruc", "=", ruc)
    .where("month", "=", month)
    .executeTakeFirst();

  if (!credit) {
    if (!input.sellerUserId || !seller) {
      return Err(fail("merchant_attribution_not_found"));
    }

    const source = await db
      .selectFrom("organizations as organization")
      .innerJoin(
        "gpv_snapshot_placements as placement",
        "placement.ruc",
        "organization.ruc",
      )
      .innerJoin("gpv_snapshot_observations as observation", (join) =>
        join
          .onRef("observation.snapshot_id", "=", "placement.snapshot_id")
          .onRef("observation.placement_id", "=", "placement.id"),
      )
      .innerJoin(
        "gpv_snapshots as snapshot",
        "snapshot.id",
        "placement.snapshot_id",
      )
      .select(["organization.id as organization_id", "snapshot.id"])
      .where("organization.ruc", "=", ruc)
      .where("observation.realized_month", "=", month)
      .where("snapshot.state", "in", ["active", "superseded"])
      .orderBy("snapshot.cut_at")
      .orderBy("snapshot.revision")
      .executeTakeFirst();

    if (!source) {
      return Err(fail("merchant_credit_source_not_found"));
    }

    await db
      .insertInto("merchant_month_credits")
      .values({
        ruc,
        month,
        organization_id: source.organization_id,
        seller_user_id: input.sellerUserId,
        branch_id: seller.branch_id,
        first_snapshot_id: source.id,
        credited_at: input.now,
      })
      .onConflict((oc) => oc.columns(["ruc", "month"]).doNothing())
      .execute();
  }

  await db
    .insertInto("merchant_month_credit_adjustments")
    .values({
      ruc,
      month,
      seller_user_id: input.sellerUserId,
      branch_id: seller?.branch_id ?? null,
      reason: input.reason,
      adjusted_by: input.adjustedBy,
      adjusted_at: input.now,
    })
    .execute();
  await createEventsRepo(db).append({
    entityType: "merchant_ruc",
    entityId: ruc,
    type: "merchant_attribution_resolved",
    actorUserId: input.adjustedBy,
    subjectUserId: input.sellerUserId,
    payload: {
      month: input.month,
      reason: input.reason,
    },
    occurredAt: input.now,
  });

  return Ok(undefined);
}
