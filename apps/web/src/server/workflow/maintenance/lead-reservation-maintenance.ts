import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { expireLapsedReservations } from "~/server/workflow/lead/commands/expire-reservation";

const logger = createLogger("lead-reservation-maintenance");
const SWEEP_INTERVAL_MS = 60_000;

interface LeadReservationMaintenanceDeps {
  executor: DatabaseExecutor;
}

async function runReservationSweepTick(deps: LeadReservationMaintenanceDeps) {
  try {
    const expiredCount = await expireLapsedReservations(
      { executor: deps.executor },
      new Date(),
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

// Registration also releases lazily, so cadence only bounds stale visibility.
export function startLeadReservationMaintenance(
  deps: LeadReservationMaintenanceDeps,
) {
  setInterval(() => {
    void runReservationSweepTick(deps);
  }, SWEEP_INTERVAL_MS);
}
