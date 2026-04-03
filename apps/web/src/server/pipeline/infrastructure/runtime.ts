import type { DatabaseExecutor } from "../../shared/db-executor";
import { runInPipelineTransaction } from "../../shared/pipeline-transaction";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import type { PipelineAuditService } from "../application/ports/audit-service";
import type { PipelineEngineGateway } from "../application/ports/engine-gateway";
import type { PipelineNotificationCenter } from "../application/ports/notification-center";
import {
  createPipelineAuditLogRepo,
  createPipelineAuditService,
} from "./audit-log";
import { createPipelineDeps, type PipelineDeps } from "./deps";
import { createEngineGateway } from "./engine-gateway";
import { createPipelineNotificationCenter } from "./notifications";

export type PipelineCommandRuntime = {
  deps: PipelineDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  notificationCenter: PipelineNotificationCenter;
};

export type PipelineQueryRuntime = {
  deps: PipelineDeps;
};

function createPipelineAuditServiceRuntime(executor: DatabaseExecutor) {
  return createPipelineAuditService({
    auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
  });
}

function createPipelineCommandRuntime(
  executor: DatabaseExecutor,
): PipelineCommandRuntime {
  return {
    deps: createPipelineDeps(executor),
    auditService: createPipelineAuditServiceRuntime(executor),
    engineGateway: createEngineGateway(),
    notificationCenter: createPipelineNotificationCenter(executor),
  };
}

export function createPipelineQueryRuntime(): PipelineQueryRuntime {
  return {
    deps: createPipelineDeps(),
  };
}

export async function runPipelineCommand<TResult>(
  operation: (runtime: PipelineCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    return operation(createPipelineCommandRuntime(executor));
  });
}
