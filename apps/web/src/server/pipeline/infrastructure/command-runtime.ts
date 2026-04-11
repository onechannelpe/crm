import {
  createPipelineFeatureDeps,
  type PipelineDeps,
} from "~/server/features/pipeline/application/pipeline-deps";
import { serverRuntime } from "~/server/runtime";

import type { DatabaseExecutor } from "../../shared/db-executor";
import { runInPipelineTransaction } from "../../shared/pipeline-transaction";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import type { PipelineAuditService } from "../application/ports/audit-service";
import type { PipelineEngineGateway } from "../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../application/ports/enrichment-queue";
import type { PipelineNotificationCenter } from "../application/ports/notification-center";
import {
  createPipelineAuditLogRepo,
  createPipelineAuditService,
} from "./audit-log";
import { createEngineGateway } from "./engine-gateway";
import { createLeadEnrichmentQueue } from "./enrichment-queue";
import { createPipelineNotificationCenter } from "./notifications";

export type PipelineCommandRuntime = {
  deps: PipelineDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  notificationCenter: PipelineNotificationCenter;
};

function createPipelineAuditServiceRuntime(executor: DatabaseExecutor) {
  return createPipelineAuditService({
    auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
  });
}

function createPipelineCommandRuntime(
  executor: DatabaseExecutor,
): PipelineCommandRuntime {
  const { enrichmentCommand } = serverRuntime.clientSearch;

  return {
    deps: createPipelineFeatureDeps(executor),
    auditService: createPipelineAuditServiceRuntime(executor),
    engineGateway: createEngineGateway(),
    leadEnrichmentQueue: createLeadEnrichmentQueue(enrichmentCommand),
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
