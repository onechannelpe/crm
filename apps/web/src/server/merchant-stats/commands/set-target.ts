import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface SetTargetInput {
  ruc: string;
  effectiveFrom: CalendarMonth;
  projectedGpv: number | null;
  setBy: UserId;
  now: Date;
}

// Targets are effective-dated. A later revision never changes an earlier month.
export async function setTarget(
  db: DatabaseExecutor,
  input: SetTargetInput,
): Promise<Result<void, DomainError>> {
  if (db.isTransaction) {
    return setTargetInTransaction(db, input);
  }

  return db.transaction().execute((tx) => setTargetInTransaction(tx, input));
}

async function setTargetInTransaction(
  tx: DatabaseExecutor,
  input: SetTargetInput,
): Promise<Result<void, DomainError>> {
  const ruc = input.ruc.trim();
  const organization = await tx
    .selectFrom("organizations")
    .select("id")
    .where("ruc", "=", ruc)
    .executeTakeFirst();

  if (!organization) {
    return Err(fail("merchant_stats_not_found"));
  }

  await tx
    .insertInto("merchant_gpv_targets")
    .values({
      organization_id: organization.id,
      effective_from: calendarMonthStart(input.effectiveFrom),
      monthly_target_gpv: input.projectedGpv,
      set_by: input.setBy,
      set_at: input.now,
    })
    .onConflict((oc) =>
      oc.columns(["organization_id", "effective_from"]).doUpdateSet({
        monthly_target_gpv: input.projectedGpv,
        set_by: input.setBy,
        set_at: input.now,
      }),
    )
    .execute();

  await createEventsRepo(tx).append({
    entityType: "merchant_ruc",
    entityId: ruc,
    type: "merchant_target_set",
    actorUserId: input.setBy,
    payload: {
      effectiveFrom: input.effectiveFrom,
      projectedGpv: input.projectedGpv,
    },
    occurredAt: input.now,
  });

  return Ok(undefined);
}
