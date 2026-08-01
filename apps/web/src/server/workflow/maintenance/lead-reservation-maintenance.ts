import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { expireLapsedReservations } from "~/server/workflow/lead/commands/expire-reservation";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("lead-reservation-maintenance");
const SWEEP_INTERVAL_MS = 60_000;

interface LeadReservationMaintenanceDeps {
  executor: DatabaseExecutor;
}

async function runReservationSweepTick(
  deps: LeadReservationMaintenanceDeps,
  sweptAt: Date,
) {
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
export function startLeadReservationMaintenance(
  deps: LeadReservationMaintenanceDeps,
): () => void {
  const timer = setInterval(() => {
    // One sweep, one instant.
    void runReservationSweepTick(deps, new Date());
  }, SWEEP_INTERVAL_MS);

  return () => clearInterval(timer);
}
