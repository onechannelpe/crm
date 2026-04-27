import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import { createWorkflowQueryApi } from "~/server/workflow/application/query-api";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  const repos = createWorkflowRepos(infra.db);

  const queryApi = createWorkflowQueryApi({
    leadDetail: {
      leads: repos.leads,
      leadFavorites: repos.leadFavorites,
      leadCommercialInputs: repos.leadCommercialInputs,
      leadHistory: repos.leadHistory,
      leadQuotations: repos.leadQuotations,
      leadSales: repos.leadSales,
      leadNegotiationRequests: repos.leadNegotiationRequests,
      negotiationFiles: repos.negotiationFiles,
      sourceStatuses: repos.sourceStatuses,
      users: repos.users,
    },
    assignableExecutives: {
      leads: repos.leads,
      users: repos.users,
    },
  });

  return {
    repos,
    engineGateway,
    queryApi,
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
