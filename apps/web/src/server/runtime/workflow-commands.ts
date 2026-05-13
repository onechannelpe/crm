import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { getServerRuntime } from "~/server/runtime";
import { runResultTransaction } from "~/server/shared/application/uow";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
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

export type WorkflowCommandRuntime = {
  useCases: WorkflowUseCases;
};

function createWorkflowCommandRuntime(
  executor: Transaction<Database>,
  engineGateway: WorkflowEngineGateway,
): WorkflowCommandRuntime {
  const repos = createWorkflowRepos(executor);
  const auditService = createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(createWorkflowAuditLogsRepo(executor)),
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

  return { useCases };
}

export async function runWorkflowCommand<TResult>(
  operation: (
    runtime: WorkflowCommandRuntime,
  ) => Promise<Result<TResult, DomainError>>,
): Promise<Result<TResult, DomainError>> {
  const { workflow } = getServerRuntime();
  return runResultTransaction(
    (work) =>
      getServerRuntime()
        .infra.db.transaction()
        .execute((trx) => work(trx)),
    (executor) =>
      operation(createWorkflowCommandRuntime(executor, workflow.engineGateway)),
  );
}
