import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledWorkflowScenario } from "../compiler";
import { persistCompanyRegistryRecords } from "./company-registry-records";
import { persistWorkflowFulfillment } from "./fulfillment";
import { persistWorkflowHistoryEvents } from "./history-events";
import { persistOrganizations } from "./organizations";
import { persistWorkflowCommercialData } from "./workflow-commercial";
import { persistWorkflowLeadsAndAssignments } from "./workflow-leads";

export async function persistWorkflowSample(
  db: Kysely<Database>,
  compiled: CompiledWorkflowScenario,
): Promise<void> {
  const anchorMs = compiled.generatedAtMs;
  const day = compiled.dayMs;
  const overlayTtl = compiled.overlayTtlMs;
  const { leads } = compiled;

  const orgIdByRuc = await persistOrganizations(db, leads, new Date(anchorMs));
  await persistWorkflowLeadsAndAssignments(
    db,
    anchorMs,
    day,
    orgIdByRuc,
    leads,
  );
  await persistCompanyRegistryRecords(db, anchorMs, day, overlayTtl, leads);
  await persistWorkflowCommercialData(db, anchorMs, day, orgIdByRuc, leads);
  // Needs the venues created above (units reference them).
  await persistWorkflowFulfillment(db, anchorMs, day, leads);
  await persistWorkflowHistoryEvents(db, anchorMs, day, leads);
}
