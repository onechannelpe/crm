import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import { createOrganizationRepo } from "~/server/organization/organization-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { createDigitalPolicyRepo } from "./lead/digital-policy/repo";
import { createFulfillmentRepo } from "./lead/fulfillment/repo";
import { createHistoryRepo } from "./lead/read/history/history-repo";
import { createLeadFavoriteRepo } from "./lead/read/lead-favorite-repo";
import { createLeadQueries } from "./lead/read/lead-queries";
import { createWorkflowUsersRepo } from "./lead/read/users-repo";
import { createLeadVenueRepo } from "./lead/venue/repo";
import { createLeadRepo } from "./lead/write/lead-repo";
import { createRateProposalRepo } from "./lead/write/rate-proposal-repo";
import { createRateRevisionRepo } from "./lead/write/rate-revision-repo";
import { createSourceStatusRepo } from "./lead/write/source-status-repo";
import { createPendingQuotationPolicyRepo } from "./policy/pending-quotation-policy-repo";
import { createRateProposalPolicyRepo } from "./policy/rate-proposal-policy-repo";
import { createSourcingPolicyRepo } from "./policy/sourcing-policy-repo";

export function createWorkflowRepos(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadQueries: createLeadQueries(executor),
    leadFavorites: createLeadFavoriteRepo(executor),
    digitalPolicies: createDigitalPolicyRepo(executor),
    leadHistory: createHistoryRepo(executor),
    rateProposals: createRateProposalRepo(executor),
    rateProposalPolicies: createRateProposalPolicyRepo(executor),
    pendingQuotationPolicies: createPendingQuotationPolicyRepo(executor),
    leadVenues: createLeadVenueRepo(executor),
    fulfillment: createFulfillmentRepo(executor),
    rateRevisions: createRateRevisionRepo(executor),
    rateRevisionFiles: createRateRevisionFilesRepo(executor),
    sourceStatuses: createSourceStatusRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createWorkflowUsersRepo(executor),
    organization: createOrganizationRepo(executor),
  };
}

export type WorkflowRepos = ReturnType<typeof createWorkflowRepos>;
