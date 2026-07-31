import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createObservabilityService } from "~/server/observability/service";
import { db } from "~/server/platform/database/db";

import type { TelemetryRow } from "./telemetry";

const actionObservations = createActionObservationsRepo(db);

export async function recordActionObservation(
  row: TelemetryRow,
): Promise<void> {
  const observability = createObservabilityService({
    actionObservations,
    authFunnelEvents: undefined as never,
  });
  await observability.recordAction(row);
}
