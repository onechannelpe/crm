import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { getServerRuntime } from "~/server/runtime";

import { runInWorkflowTransaction } from "../../shared/workflow-transaction";
import {
  createWorkflowCommandApi,
  type WorkflowCommandApi,
} from "../application/command-api";
import type { WorkflowAuditService } from "../application/ports/audit-service";
import type { WorkflowEngineGateway } from "../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../application/ports/enrichment-queue";
import { systemLeadClock } from "../application/services/lead-clock";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "./audit-log";
import { createWorkflowNotificationCenter } from "./notifications";
import { createLeadMutationUow } from "./repos/lead-mutation-uow";
import { createLeadReadRepository } from "./repos/lead-read-repo";
import { createLeadUserScopeRepository } from "./repos/lead-user-scope-repo";
import { createWorkflowRepos, type WorkflowRepos } from "./workflow-repos";

export type WorkflowCommandRuntime = {
  repos: WorkflowRepos;
  auditService: WorkflowAuditService;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  commandApi: WorkflowCommandApi;
};

function createWorkflowCommandRuntime(
  executor: Transaction<Database>,
  engineGateway: WorkflowEngineGateway,
): WorkflowCommandRuntime {
  const repos = createWorkflowRepos(executor);
  const auditService = createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });
  const notificationCenter = createWorkflowNotificationCenter(executor);
  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
  );
  const leadEnrichmentQueue: LeadEnrichmentQueue = {
    async enqueueRucVerification(ruc, requestedByUserId) {
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };

  const commandApi = createWorkflowCommandApi({
    leadReader: createLeadReadRepository(repos.leads),
    leadFavorites: repos.leadFavorites,
    mutationUow: createLeadMutationUow(executor),
    users: createLeadUserScopeRepository(repos.users),
    notificationCenter,
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
    leadCommercialInputs: repos.leadCommercialInputs,
    party: repos.party,
    leadSales: repos.leadSales,
    leadSaleVenues: repos.leadSaleVenues,
    negotiationRequests: repos.leadNegotiationRequests,
  });

  return { repos, auditService, leadEnrichmentQueue, commandApi };
}

export async function runWorkflowCommand<TResult>(
  operation: (runtime: WorkflowCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  const { workflow } = getServerRuntime();
  return runInWorkflowTransaction(async ({ executor }) =>
    operation(createWorkflowCommandRuntime(executor, workflow.engineGateway)),
  );
}
