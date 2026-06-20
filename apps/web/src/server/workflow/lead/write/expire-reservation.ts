import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { expireReservation } from "../../lead/domain/decide";
import { isReservationLapsed } from "../../lead/domain/reservation";
import { createLeadRepo } from "./lead-repo";
import { runLeadTransaction } from "./transition";

// Releases a single lead whose RUC hold has lapsed. Idempotent: a lead that is
// no longer in PRICING or whose hold is not actually lapsed is left untouched,
// so the sweep and the registration guard can both call this safely.
export async function expireLeadReservation(
  executor: DatabaseExecutor,
  leadId: string,
  now: number,
): Promise<Result<void, DomainError>> {
  return runLeadTransaction({ executor, now }, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(leadId);
    if (!state) return Ok(undefined);
    if (state.stage !== "PRICING" || !isReservationLapsed(state, ctx.now)) {
      return Ok(undefined);
    }

    const transition = expireReservation(state, { now: ctx.now });
    if (!transition.ok) return transition;

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok(undefined);
  });
}

// Retires every lead whose hold has lapsed since the last tick.
export async function expireLapsedReservations(
  deps: { executor: DatabaseExecutor },
  now: number,
): Promise<number> {
  const lapsed = await createLeadRepo(deps.executor).findLapsedReservations(
    now,
  );

  let expiredCount = 0;
  for (const leadId of lapsed) {
    // Each expiry is isolated: one stale row must not roll back the whole sweep.
    // eslint-disable-next-line no-await-in-loop
    const result = await expireLeadReservation(deps.executor, leadId, now);
    if (result.ok) expiredCount += 1;
  }
  return expiredCount;
}
