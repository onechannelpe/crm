import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { expireReservation } from "../../domain/lead/commands";
import { isReservationLapsed } from "../../domain/lead/reservation";
import { createLeadRepo } from "../../infrastructure/lead-repo";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";

// Releases a single lead whose RUC hold has lapsed. Idempotent: a lead that is
// no longer in PRICING or whose hold is not actually lapsed is left untouched,
// so the sweep and the registration guard can both call this safely.
export async function expireLeadReservation(
  executor: DatabaseExecutor,
  leadId: string,
  now: number,
): Promise<Result<void, DomainError>> {
  return executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(leadId);
    if (!state) return Ok(undefined);
    if (state.stage !== "PRICING" || !isReservationLapsed(state, now)) {
      return Ok(undefined);
    }

    const transition = expireReservation(state, { now });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
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
