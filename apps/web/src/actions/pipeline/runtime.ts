import type { PipelineAuditService } from "~/server/pipeline/application/ports/audit-service";
import type { PipelineEngineGateway } from "~/server/pipeline/application/ports/engine-gateway";
import type { PipelineNotificationCenter } from "~/server/pipeline/application/ports/notification-center";
import {
  createPipelineAuditService,
  createPipelineDeps,
  createPipelineEngineGateway,
  createPipelineNotificationCenter,
  createPipelineQueryDeps,
} from "~/server/pipeline/infrastructure/deps";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";

type PipelineRuntimeDeps = ReturnType<typeof createPipelineDeps>;

export type PipelineCommandRuntime = {
  deps: PipelineRuntimeDeps;
  auditService: PipelineAuditService;
};

export type PipelineNotificationRuntime = PipelineCommandRuntime & {
  notificationCenter: PipelineNotificationCenter;
};

export type PipelineRegistrationRuntime = PipelineCommandRuntime & {
  engineGateway: PipelineEngineGateway;
};

export function createPipelineQueryRuntime() {
  return createPipelineQueryDeps();
}

export function runPipelineCommand<TResult>(
  operation: (runtime: PipelineCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
    });
  });
}

export function runPipelineNotificationCommand<TResult>(
  operation: (runtime: PipelineNotificationRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
      notificationCenter: createPipelineNotificationCenter(executor),
    });
  });
}

export function runPipelineRegistrationCommand<TResult>(
  operation: (runtime: PipelineRegistrationRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
      engineGateway: createPipelineEngineGateway(),
    });
  });
}
