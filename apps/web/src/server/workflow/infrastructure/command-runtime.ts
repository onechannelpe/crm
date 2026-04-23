import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import {
  createWorkflowFeatureDeps,
  type WorkflowDeps,
} from "~/server/features/workflow/application/workflow-deps";

import type { DatabaseExecutor } from "../../shared/db-executor";
import { runInPipelineTransaction } from "../../shared/pipeline-transaction";
import type { PipelineAuditService } from "../application/ports/audit-service";
import type { PipelineEngineGateway } from "../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../application/ports/enrichment-queue";
import type { PipelineNotificationCenter } from "../application/ports/notification-center";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "./audit-log";
import { createEngineGateway } from "./engine-gateway";
import { createWorkflowNotificationCenter } from "./notifications";

export type PipelineCommandRuntime = {
  executor: DatabaseExecutor;
  deps: WorkflowDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  notificationCenter: PipelineNotificationCenter;
};

function createPipelineAuditServiceRuntime(executor: DatabaseExecutor) {
  return createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });
}

function createPipelineCommandRuntime(
  executor: DatabaseExecutor,
): PipelineCommandRuntime {
  const enrichmentRepo = createSearchEnrichmentRepo(executor);
  const enrichmentCommand = createEnrichmentCommand(enrichmentRepo);

  return {
    executor,
    deps: createWorkflowFeatureDeps(executor),
    auditService: createPipelineAuditServiceRuntime(executor),
    engineGateway: createEngineGateway(),
    leadEnrichmentQueue: {
      async enqueueRucVerification(ruc, requestedByUserId) {
        await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
      },
    },
    notificationCenter: createWorkflowNotificationCenter(executor),
  };
}

export async function runWorkflowCommand<TResult>(
  operation: (runtime: PipelineCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) =>
    operation(createPipelineCommandRuntime(executor)),
  );
}
