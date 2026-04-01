import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createPipelineRepos } from "~/server/shared/pipeline-runtime";

import { createLeadHistoryRepo } from "./lead-history-repo";
import { createPipelineLeadInteractionRepo } from "./lead-interaction-repo";
import { createLeadSourcingPolicyRepo } from "./sourcing-policy-repo";

export function createLeadPipelineRepos(executor: DatabaseExecutor) {
  return {
    ...createPipelineRepos(executor),
    leadHistory: createLeadHistoryRepo(executor),
    leadInteractions: createPipelineLeadInteractionRepo(executor),
    sourcingPolicies: createLeadSourcingPolicyRepo(executor),
  };
}

export type LeadPipelineRepos = ReturnType<typeof createLeadPipelineRepos>;
