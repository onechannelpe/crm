import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { RegisterLeadDeps } from "~/server/workflow/application/deps/register-lead";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "~/server/workflow/infrastructure/audit-log";
import { createLeadMutationNotificationPublisher } from "~/server/workflow/infrastructure/lead-mutation-notification-publisher";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/lead-mutation-uow";
import type { WorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";

export type WorkflowCommandDeps = {
  repos: WorkflowRepos;
  mutationUow: ReturnType<typeof createLeadMutationUow>;
  clock: typeof systemLeadClock;
  registerLead: RegisterLeadDeps;
  auditService: ReturnType<typeof createWorkflowAuditService>;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
};

export function createWorkflowCommandDeps(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
  engineGateway: WorkflowEngineGateway,
): WorkflowCommandDeps {
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
  const publishNotifications =
    createLeadMutationNotificationPublisher(executor);

  return {
    repos,
    mutationUow: createLeadMutationUow(executor, {
      publishNotifications,
    }),
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
  };
}
