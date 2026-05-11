import { createNegotiationFilesRepo } from "~/server/files/repo/negotiation";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createAssignmentRepo } from "./assignment-repo";
import { createHistoryRepo } from "./history-repo";
import { createLeadFavoriteRepo } from "./lead-favorite-repo";
import { createLeadProfileRepo } from "./lead-profile-repo";
import { createLeadQueries } from "./lead-queries";
import { createLeadRepo } from "./lead-repo";
import { createLeadVenueRepo } from "./lead-venue-repo";
import { createNegotiationRequestRepo } from "./negotiation-request-repo";
import { createPartyRepo } from "./party-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSourceStatusRepo } from "./source-status-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createWorkflowUsersRepo } from "./users-repo";

export function createWorkflowRepos(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadQueries: createLeadQueries(executor),
    leadFavorites: createLeadFavoriteRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadProfiles: createLeadProfileRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadVenues: createLeadVenueRepo(executor),
    leadNegotiationRequests: createNegotiationRequestRepo(executor),
    negotiationFiles: createNegotiationFilesRepo(executor),
    sourceStatuses: createSourceStatusRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createWorkflowUsersRepo(executor),
    party: createPartyRepo(executor),
  };
}

export type WorkflowRepos = ReturnType<typeof createWorkflowRepos>;
