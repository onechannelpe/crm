import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import { createWorkflowQueryApi } from "~/server/workflow/application/query-api";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import {
  createWorkflowUseCases,
  type WorkflowUseCases,
} from "~/server/workflow/application/use-cases";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "~/server/workflow/infrastructure/audit-log";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/repos/lead-mutation-uow";
import { createLeadReadRepository } from "~/server/workflow/infrastructure/repos/lead-read-repo";
import { createLeadUserScopeRepository } from "~/server/workflow/infrastructure/repos/lead-user-scope-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

function createWorkflowUseCasesRuntime(
  executor: Transaction<Database>,
  engineGateway: WorkflowEngineGateway,
): WorkflowUseCases {
  const repos = createWorkflowRepos(executor);
  const auditService = createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });
  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
  );
  const leadEnrichmentQueue: LeadEnrichmentQueue = {
    async enqueueRucVerification(ruc, requestedByUserId) {
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };

  const useCases = createWorkflowUseCases({
    leadReader: createLeadReadRepository(repos.leads),
    leadRepo: repos.leads,
    leadFavorites: repos.leadFavorites,
    mutationUow: createLeadMutationUow(executor),
    users: createLeadUserScopeRepository(repos.users),
    clock: systemLeadClock,
    registerLead: {
      leads: repos.leads,
      leadAssignments: repos.leadAssignments,
      leadHistory: repos.leadHistory,
      users: repos.users,
      party: repos.party,
    },
    auditService,
    engineGateway,
    leadEnrichmentQueue,
    leadQuotations: repos.leadQuotations,
    leadProfiles: repos.leadProfiles,
    party: repos.party,
    leadVenues: repos.leadVenues,
    negotiationRequests: repos.leadNegotiationRequests,
    sourcingPolicies: repos.sourcingPolicies,
  });

  return useCases;
}

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  const repos = createWorkflowRepos(infra.db);

  const queryApi = createWorkflowQueryApi({
    leadDetail: {
      leads: repos.leads,
      leadFavorites: repos.leadFavorites,
      leadProfiles: repos.leadProfiles,
      leadHistory: repos.leadHistory,
      leadQuotations: repos.leadQuotations,
      leadVenues: repos.leadVenues,
      leadNegotiationRequests: repos.leadNegotiationRequests,
      negotiationFiles: repos.negotiationFiles,
      sourceStatuses: repos.sourceStatuses,
      users: repos.users,
      party: repos.party,
    },
    assignableExecutives: {
      leads: repos.leads,
      users: repos.users,
    },
  });

  return {
    repos,
    engineGateway,
    useCases: createWorkflowUseCasesRuntime(infra.db, engineGateway),
    queryApi,
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
