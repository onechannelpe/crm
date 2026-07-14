import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledWorkflowScenario } from "../compiler";
import { persistCompanyRegistryRecords } from "./company-registry-records";
import { persistWorkflowHistoryEvents } from "./history-events";
import { persistOrganizations } from "./organizations";
import { persistWorkflowCommercialData } from "./workflow-commercial";
import { persistWorkflowLeadsAndAssignments } from "./workflow-leads";

export async function persistWorkflowSample(
  db: Kysely<Database>,
  compiled: CompiledWorkflowScenario,
): Promise<void> {
  const now = compiled.generatedAtMs;
  const day = compiled.dayMs;
  const overlayTtl = compiled.overlayTtlMs;
  const { leads } = compiled;

  const orgIdByRuc = await persistOrganizations(db, leads, new Date(now));
  await persistWorkflowLeadsAndAssignments(db, now, day, orgIdByRuc, leads);
  await persistCompanyRegistryRecords(db, now, day, overlayTtl, leads);
  await persistWorkflowCommercialData(db, now, day, orgIdByRuc, leads);
  await persistWorkflowHistoryEvents(db, now, day, leads);
}
