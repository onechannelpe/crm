import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createPipelineRepos } from "~/server/shared/pipeline-runtime";

import { createLeadAssignmentRepo } from "./lead-assignment-repo";
import { createLeadCommercialInputRepo } from "./lead-commercial-input-repo";
import { createLeadHistoryRepo } from "./lead-history-repo";
import { createPipelineLeadInteractionRepo } from "./lead-interaction-repo";
import { createLeadRepo } from "./lead-repo";
import { createLeadSourcingPolicyRepo } from "./sourcing-policy-repo";

export function createLeadPipelineRepos(executor: DatabaseExecutor) {
  return {
    ...createPipelineRepos(executor),
    leads: createLeadRepo(executor),
    leadAssignments: createLeadAssignmentRepo(executor),
    leadCommercialInputs: createLeadCommercialInputRepo(executor),
    leadHistory: createLeadHistoryRepo(executor),
    leadInteractions: createPipelineLeadInteractionRepo(executor),
    sourcingPolicies: createLeadSourcingPolicyRepo(executor),
  };
}

export type LeadPipelineRepos = ReturnType<typeof createLeadPipelineRepos>;
