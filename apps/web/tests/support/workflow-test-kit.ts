import { createWorkflowCommandApi } from "~/server/workflow/application/command-api";
import type { WorkflowAuditService } from "~/server/workflow/application/ports/audit-service";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import type { WorkflowNotificationCenter } from "~/server/workflow/application/ports/notification-center";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/repos/lead-mutation-uow";
import { createLeadReadRepository } from "~/server/workflow/infrastructure/repos/lead-read-repo";
import { createLeadUserScopeRepository } from "~/server/workflow/infrastructure/repos/lead-user-scope-repo";

import type { TestRuntime } from "./runtime/create-test-runtime";

const NO_OP_NOTIFICATIONS: WorkflowNotificationCenter = {
  notifyUsers: async () => {},
  notifyBranchRoles: async () => {},
};

const NO_OP_AUDIT: WorkflowAuditService = {
  log: async () => {},
};

const NO_OP_ENGINE_GATEWAY: WorkflowEngineGateway = {
  enrichByRuc: async () => null,
};

const NO_OP_ENRICHMENT_QUEUE: LeadEnrichmentQueue = {
  enqueueRucVerification: async () => {},
};

export function createTestCommandApi(
  runtime: TestRuntime,
  overrides?: {
    engineGateway?: WorkflowEngineGateway;
    auditService?: WorkflowAuditService;
    notificationCenter?: WorkflowNotificationCenter;
    leadEnrichmentQueue?: LeadEnrichmentQueue;
  },
) {
  const { repos } = runtime.workflow;
  return createWorkflowCommandApi({
    leadReader: createLeadReadRepository(repos.leads),
    leadFavorites: repos.leadFavorites,
    mutationUow: createLeadMutationUow(runtime.ctx.db),
    users: createLeadUserScopeRepository(repos.users),
    clock: systemLeadClock,
    registerLead: {
      leads: repos.leads,
      leadAssignments: repos.leadAssignments,
      leadHistory: repos.leadHistory,
      users: repos.users,
    },
    leadQuotations: repos.leadQuotations,
    leadCommercialInputs: repos.leadCommercialInputs,
    leadSales: repos.leadSales,
    notificationCenter: overrides?.notificationCenter ?? NO_OP_NOTIFICATIONS,
    auditService: overrides?.auditService ?? NO_OP_AUDIT,
    engineGateway: overrides?.engineGateway ?? NO_OP_ENGINE_GATEWAY,
    leadEnrichmentQueue:
      overrides?.leadEnrichmentQueue ?? NO_OP_ENRICHMENT_QUEUE,
  });
}
