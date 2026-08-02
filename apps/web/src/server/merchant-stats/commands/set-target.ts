import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

export interface SetTargetInput {
  ruc: string;
  effectiveFrom: CalendarMonth;
  projectedGpv: number | null;
  setBy: UserId;
  operation: OperationContext;
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
      set_at: input.operation.operationAt,
    })
    .onConflict((oc) =>
      oc.columns(["organization_id", "effective_from"]).doUpdateSet({
        monthly_target_gpv: input.projectedGpv,
        set_by: input.setBy,
        set_at: input.operation.operationAt,
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
    occurredAt: input.operation.operationAt,
  });

  return Ok(undefined);
}
