import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { recordActionObservation as persistActionObservation } from "~/server/observability/service";
import { db } from "~/server/platform/database/db";

import type { TelemetryRow } from "./telemetry";

const actionObservations = createActionObservationsRepo(db);

export async function recordActionObservation(
  row: TelemetryRow,
): Promise<void> {
  await persistActionObservation(actionObservations, row);
}
