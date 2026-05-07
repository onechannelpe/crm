import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import {
  createWorkflowCommandApi,
  type WorkflowCommandApi,
} from "~/server/workflow/application/command-api";
import type { WorkflowAuditService } from "~/server/workflow/application/ports/audit-service";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/repos/lead-mutation-uow";
import { createLeadReadRepository } from "~/server/workflow/infrastructure/repos/lead-read-repo";
import { createLeadUserScopeRepository } from "~/server/workflow/infrastructure/repos/lead-user-scope-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";

import type { TestRuntime } from "../runtime/app";

const NO_OP_AUDIT: WorkflowAuditService = {
  log: async () => {},
};

const NO_OP_ENGINE_GATEWAY: WorkflowEngineGateway = {
  enrichByRuc: async () => null,
};

const NO_OP_ENRICHMENT_QUEUE: LeadEnrichmentQueue = {
  enqueueRucVerification: async () => {},
};

export type TestCommandOverrides = {
  engineGateway?: WorkflowEngineGateway;
  auditService?: WorkflowAuditService;
  leadEnrichmentQueue?: LeadEnrichmentQueue;
};

function buildCommandApi(
  executor: Transaction<Database>,
  overrides?: TestCommandOverrides,
): WorkflowCommandApi {
  const repos = createWorkflowRepos(executor);
  return createWorkflowCommandApi({
    leadReader: createLeadReadRepository(repos.leads),
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
    leadQuotations: repos.leadQuotations,
    leadCommercialInputs: repos.leadCommercialInputs,
    party: repos.party,
    leadSales: repos.leadSales,
    leadSaleVenues: repos.leadSaleVenues,
    negotiationRequests: repos.leadNegotiationRequests,
    auditService: overrides?.auditService ?? NO_OP_AUDIT,
    engineGateway: overrides?.engineGateway ?? NO_OP_ENGINE_GATEWAY,
    leadEnrichmentQueue:
      overrides?.leadEnrichmentQueue ?? NO_OP_ENRICHMENT_QUEUE,
  });
}

export function runTestWorkflowCommand<T>(
  runtime: TestRuntime,
  operation: (commandApi: WorkflowCommandApi) => Promise<T>,
  overrides?: TestCommandOverrides,
): Promise<T> {
  return runtime.ctx.db
    .transaction()
    .execute((trx) => operation(buildCommandApi(trx, overrides)));
}
