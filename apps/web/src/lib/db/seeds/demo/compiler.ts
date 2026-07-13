import type { WorkflowLeadId } from "~/server/shared/ids";

import { WORKFLOW_LEAD_IDS } from "./demo-ids";
import {
  LEADS,
  ORGANIZATION_KEYS,
  type LeadSeedKey,
  type OrganizationSeedKey,
} from "./scenario";

export type CompiledWorkflowScenario = {
  leadIdsByKey: Map<LeadSeedKey, WorkflowLeadId>;
  organizationKeys: readonly OrganizationSeedKey[];
  leadKeys: readonly LeadSeedKey[];
  generatedAtMs: number;
  dayMs: number;
  overlayTtlMs: number;
};

export function compileWorkflowScenario(
  nowMs: number,
): CompiledWorkflowScenario {
  const organizationKeySet = new Set<OrganizationSeedKey>(ORGANIZATION_KEYS);

  for (const lead of LEADS) {
    if (!organizationKeySet.has(lead.organizationKey)) {
      throw new Error(
        `invalid_workflow_seed_reference:organization:${lead.organizationKey}`,
      );
    }
  }

  const leadIdsByKey = new Map<LeadSeedKey, WorkflowLeadId>();
  for (const lead of LEADS) {
    leadIdsByKey.set(lead.key, WORKFLOW_LEAD_IDS[lead.key]);
  }

  return {
    leadIdsByKey,
    organizationKeys: ORGANIZATION_KEYS,
    leadKeys: LEADS.map((lead) => lead.key),
    generatedAtMs: nowMs,
    dayMs: 86_400_000,
    overlayTtlMs: 7 * 86_400_000,
  };
}
