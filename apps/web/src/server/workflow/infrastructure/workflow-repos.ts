import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createAssignmentRepo } from "./assignment-repo";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createHistoryRepo } from "./history-repo";
import { createLeadFavoriteRepo } from "./lead-favorite-repo";
import { createLeadQueries } from "./lead-queries";
import { createLeadRepo } from "./lead-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourceStatusRepo } from "./source-status-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createWorkflowUsersRepo } from "./users-repo";

export function createWorkflowRepos(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadQueries: createLeadQueries(executor),
    leadFavorites: createLeadFavoriteRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
    sourceStatuses: createSourceStatusRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createWorkflowUsersRepo(executor),
  };
}

export type WorkflowRepos = ReturnType<typeof createWorkflowRepos>;
