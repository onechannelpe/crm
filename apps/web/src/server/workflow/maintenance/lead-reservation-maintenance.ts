import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { TickContext } from "~/server/platform/operation/context";
import { expireLapsedReservations } from "~/server/workflow/lead/commands/expire-reservation";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("lead-reservation-maintenance");
const SWEEP_INTERVAL_MS = 60_000;

interface LeadReservationMaintenanceDeps {
  executor: DatabaseExecutor;
}

export async function runReservationSweepTick(
  deps: LeadReservationMaintenanceDeps,
  context: TickContext<"reservation-sweep">,
) {
  const sweptAt = context.operationAt;
  try {
    const expiredCount = await expireLapsedReservations(
      { executor: deps.executor },
      sweptAt,
    );
    if (expiredCount > 0) {
      logger.info("lead_reservations_expired", { count: expiredCount });
    }
  } catch (error: unknown) {
    logger.error("lead_reservation_sweep_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Cadence bounds stale visibility only; the registration path releases
// reservations on its own, not via this sweep.
export function createLeadReservationMaintenance(
  deps: LeadReservationMaintenanceDeps,
) {
  return {
    sweepReservations: (context: TickContext<"reservation-sweep">) =>
      runReservationSweepTick(deps, context),
  };
}
