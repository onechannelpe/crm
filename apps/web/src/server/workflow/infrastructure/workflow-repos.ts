import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createAssignmentRepo } from "./assignment-repo";
import { createHistoryRepo } from "./history-repo";
import { createLeadFavoriteRepo } from "./lead-favorite-repo";
import { createLeadProfileRepo } from "./lead-profile-repo";
import { createLeadQueries } from "./lead-queries";
import { createLeadRepo } from "./lead-repo";
import { createLeadStateRepo } from "./lead-state-repo";
import { createLeadVenueRepo } from "./lead-venue-repo";
import { createPartyRepo } from "./party-repo";
import { createRateProposalRepo } from "./rate-proposal-repo";
import { createRateRevisionRepo } from "./rate-revision-repo";
import { createSourceStatusRepo } from "./source-status-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createWorkflowUsersRepo } from "./users-repo";

export function createWorkflowRepos(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadStates: createLeadStateRepo(executor),
    leadQueries: createLeadQueries(executor),
    leadFavorites: createLeadFavoriteRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadProfiles: createLeadProfileRepo(executor),
    leadHistory: createHistoryRepo(executor),
    rateProposals: createRateProposalRepo(executor),
    leadVenues: createLeadVenueRepo(executor),
    rateRevisions: createRateRevisionRepo(executor),
    rateRevisionFiles: createRateRevisionFilesRepo(executor),
    sourceStatuses: createSourceStatusRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createWorkflowUsersRepo(executor),
    party: createPartyRepo(executor),
  };
}

export type WorkflowRepos = ReturnType<typeof createWorkflowRepos>;
