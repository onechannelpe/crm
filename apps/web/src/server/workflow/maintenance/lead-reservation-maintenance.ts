import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { expireLapsedReservations } from "../application/commands/expire-reservation";

const logger = createLogger("lead-reservation-maintenance");
const SWEEP_INTERVAL_MS = 60_000;

interface LeadReservationMaintenanceDeps {
  executor: DatabaseExecutor;
}

async function runReservationSweepTick(deps: LeadReservationMaintenanceDeps) {
  try {
    const expiredCount = await expireLapsedReservations(
      { executor: deps.executor },
      Date.now(),
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

// Authoritatively retires leads whose RUC hold has lapsed, moving them to the
// terminal EXPIRED stage so the RUC is released and the owner's view stops
// showing the lead as in-progress. Registration also releases lazily, so the
// cadence here only bounds how long a lapsed lead lingers in the owner's list.
export function startLeadReservationMaintenance(
  deps: LeadReservationMaintenanceDeps,
) {
  setInterval(() => {
    void runReservationSweepTick(deps);
  }, SWEEP_INTERVAL_MS);
}
