import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledWorkflowScenario } from "../compiler";
import type { LeadSeedKey } from "../scenario";
import {
  persistWorkflowHistoryEvents,
  type WorkflowArtifactIds,
  type WorkflowLeadIds,
} from "./history-events";
import { persistOrganizations } from "./organizations";
import { persistSearchOverlays } from "./search-overlays";
import { persistWorkflowCommercialData } from "./workflow-commercial";
import { persistWorkflowLeadsAndAssignments } from "./workflow-leads";

export async function persistWorkflowSample(
  db: Kysely<Database>,
  compiled: CompiledWorkflowScenario,
): Promise<void> {
  const now = compiled.generatedAtMs;
  const day = compiled.dayMs;
  const overlayTtl = compiled.overlayTtlMs;

  const leadIds = buildLeadIds(compiled);
  const artifacts = buildWorkflowArtifactIds();
  const organizations = await persistOrganizations(db, compiled.organizationKeys, now);

  await persistWorkflowLeadsAndAssignments(
    db,
    now,
    day,
    organizations.getOrganizationId,
    leadIds,
  );
  await persistSearchOverlays(db, now, day, overlayTtl);
  await persistWorkflowCommercialData(
    db,
    now,
    day,
    leadIds,
    artifacts,
    (key) => organizations.getOrganizationId(key),
  );
  await persistWorkflowHistoryEvents(db, now, day, leadIds, artifacts);
}

function buildLeadIds(compiled: CompiledWorkflowScenario): WorkflowLeadIds {
  const getLeadId = (key: LeadSeedKey): string => {
    const leadId = compiled.leadIdsByKey.get(key);
    if (!leadId) {
      throw new Error(`missing_seed_lead_id:${key}`);
    }
    return leadId;
  };

  return {
    idPending: getLeadId("pending"),
    idNeeds: getLeadId("needs"),
    idReady: getLeadId("ready"),
    idQuoted: getLeadId("quoted"),
    idForSale: getLeadId("forSale"),
    idConverted: getLeadId("converted"),
    idRejected: getLeadId("rejected"),
  };
}

function buildWorkflowArtifactIds(): WorkflowArtifactIds {
  return {
    qidQuoted: randomUUIDv7(),
    qidForSale: randomUUIDv7(),
    qidConverted: randomUUIDv7(),
    sidConverted: randomUUIDv7(),
    vidConverted: randomUUIDv7(),
  };
}
