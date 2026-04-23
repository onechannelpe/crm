import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import {
  createPipelineFeatureDeps,
  type PipelineDeps,
} from "~/server/features/pipeline/application/pipeline-deps";

import type { DatabaseExecutor } from "../../shared/db-executor";
import { runInPipelineTransaction } from "../../shared/pipeline-transaction";
import type { PipelineAuditService } from "../application/ports/audit-service";
import type { PipelineEngineGateway } from "../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../application/ports/enrichment-queue";
import type { PipelineNotificationCenter } from "../application/ports/notification-center";
import {
  createPipelineAuditLogRepo,
  createPipelineAuditService,
  createWorkflowAuditLogsRepo,
} from "./audit-log";
import { createEngineGateway } from "./engine-gateway";
import { createPipelineNotificationCenter } from "./notifications";

export type PipelineCommandRuntime = {
  executor: DatabaseExecutor;
  deps: PipelineDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  notificationCenter: PipelineNotificationCenter;
};

function createPipelineAuditServiceRuntime(executor: DatabaseExecutor) {
  return createPipelineAuditService({
    auditLogs: createPipelineAuditLogRepo(
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
    deps: createPipelineFeatureDeps(executor),
    auditService: createPipelineAuditServiceRuntime(executor),
    engineGateway: createEngineGateway(),
    leadEnrichmentQueue: {
      async enqueueRucVerification(ruc, requestedByUserId) {
        await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
      },
    },
    notificationCenter: createPipelineNotificationCenter(executor),
  };
}

export async function runPipelineCommand<TResult>(
  operation: (runtime: PipelineCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) =>
    operation(createPipelineCommandRuntime(executor)),
  );
}
