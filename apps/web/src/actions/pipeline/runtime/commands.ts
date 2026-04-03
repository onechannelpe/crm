import type { PipelineAuditService } from "~/server/pipeline/application/ports/audit-service";
import type { PipelineEngineGateway } from "~/server/pipeline/application/ports/engine-gateway";
import type { PipelineNotificationCenter } from "~/server/pipeline/application/ports/notification-center";
import {
  createPipelineAuditLogRepo,
  createPipelineAuditService,
} from "~/server/pipeline/infrastructure/audit-log";
import { createPipelineEngineGateway } from "~/server/pipeline/infrastructure/deps";
import { createPipelineNotificationCenter } from "~/server/pipeline/infrastructure/notifications";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

export type PipelineCommandRuntime<TDeps> = {
  deps: TDeps;
  auditService: PipelineAuditService;
};

export type PipelineNotificationRuntime<TDeps> =
  PipelineCommandRuntime<TDeps> & {
    notificationCenter: PipelineNotificationCenter;
  };

export type PipelineRegistrationRuntime<TDeps> =
  PipelineCommandRuntime<TDeps> & {
    engineGateway: PipelineEngineGateway;
  };

export function runPipelineCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineCommandRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService({
        auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
      }),
    });
  });
}

export function runPipelineNotificationCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineNotificationRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService({
        auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
      }),
      notificationCenter: createPipelineNotificationCenter(executor),
    });
  });
}

export function runPipelineRegistrationCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineRegistrationRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService({
        auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
      }),
      engineGateway: createPipelineEngineGateway(),
    });
  });
}
