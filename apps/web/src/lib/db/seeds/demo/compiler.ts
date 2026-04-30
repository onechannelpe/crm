import { randomUUIDv7 } from "bun";

import {
  LEADS,
  ORGANIZATIONS,
  type LeadSeedKey,
  type OrganizationSeedKey,
} from "./scenario";

export type CompiledWorkflowScenario = {
  leadIdByKey: Record<LeadSeedKey, string>;
  organizationKeys: OrganizationSeedKey[];
  leadKeys: LeadSeedKey[];
  dayMs: number;
  overlayTtlMs: number;
};

export function compileWorkflowScenario(): CompiledWorkflowScenario {
  const organizationKeys = Object.keys(ORGANIZATIONS) as OrganizationSeedKey[];
  const organizationKeySet = new Set(organizationKeys);

  for (const lead of LEADS) {
    if (!organizationKeySet.has(lead.organizationKey)) {
      throw new Error(
        `invalid_workflow_seed_reference:organization:${lead.organizationKey}`,
      );
    }
  }

  const leadIdByKey = {} as Record<LeadSeedKey, string>;
  for (const lead of LEADS) {
    leadIdByKey[lead.key] = randomUUIDv7();
  }

  return {
    leadIdByKey,
    organizationKeys,
    leadKeys: LEADS.map((lead) => lead.key),
    dayMs: 86_400_000,
    overlayTtlMs: 7 * 86_400_000,
  };
}
