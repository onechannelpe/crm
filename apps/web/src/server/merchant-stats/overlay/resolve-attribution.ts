import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface ResolveAttributionInput {
  ruc: string;
  month: CalendarMonth;
  sellerUserId: UserId | null;
  branchId: BranchId | null;
  resolvedBy: UserId;
  now: Date;
}

export async function resolveAttribution(
  db: DatabaseExecutor,
  input: ResolveAttributionInput,
): Promise<Result<void, DomainError>> {
  const derived = await db
    .selectFrom("merchant_month_attribution")
    .select("ruc")
    .where("ruc", "=", input.ruc)
    .where("month", "=", calendarMonthStart(input.month))
    .executeTakeFirst();

  if (!derived) {
    return Err(fail("merchant_attribution_not_found"));
  }

  await db
    .insertInto("merchant_month_attribution_override")
    .values({
      ruc: input.ruc,
      month: calendarMonthStart(input.month),
      seller_user_id: input.sellerUserId,
      branch_id: input.branchId,
      resolved_by: input.resolvedBy,
      resolved_at: input.now,
    })
    .onConflict((oc) =>
      oc.columns(["ruc", "month"]).doUpdateSet((eb) => ({
        seller_user_id: eb.ref("excluded.seller_user_id"),
        branch_id: eb.ref("excluded.branch_id"),
        resolved_by: eb.ref("excluded.resolved_by"),
        resolved_at: eb.ref("excluded.resolved_at"),
      })),
    )
    .execute();

  return Ok(undefined);
}
