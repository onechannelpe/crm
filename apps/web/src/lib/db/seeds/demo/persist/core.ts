import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledWorkflowScenario } from "../compiler";
import type { LeadSeedKey } from "../scenario";
import { persistCompanyRegistryRecords } from "./company-registry-records";
import {
  persistWorkflowHistoryEvents,
  type WorkflowArtifactIds,
  type WorkflowLeadIds,
} from "./history-events";
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

  const leadIds = buildLeadIds(compiled);
  const artifacts = buildWorkflowArtifactIds();
  const organizations = await persistOrganizations(
    db,
    compiled.organizationKeys,
    new Date(now),
  );

  await persistWorkflowLeadsAndAssignments(
    db,
    now,
    day,
    organizations.getOrganizationId,
    leadIds,
  );
  await persistCompanyRegistryRecords(db, now, day, overlayTtl);
  await persistWorkflowCommercialData(db, now, day, leadIds, artifacts, (key) =>
    organizations.getOrganizationId(key),
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
    qidQuoted: "demo-workflow-quotation-quoted",
    qidForSale: "demo-workflow-quotation-for-sale",
    qidConverted: "demo-workflow-quotation-converted",
    vidConverted: "demo-workflow-venue-converted",
  };
}
