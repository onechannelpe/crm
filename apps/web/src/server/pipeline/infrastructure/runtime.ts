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
import { createEngineGateway } from "./engine-gateway";
import { createPipelineNotificationCenter } from "./notifications";

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

function createPipelineAuditServiceRuntime(executor: DatabaseExecutor) {
  return createPipelineAuditService({
    auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
  });
}

async function runPipelineRuntime<TDeps, TRuntime, TResult>(input: {
  createDeps: (executor: DatabaseExecutor) => TDeps;
  createRuntime: (executor: DatabaseExecutor, deps: TDeps) => TRuntime;
  operation: (runtime: TRuntime) => Promise<TResult>;
}): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = input.createDeps(executor);
    return input.operation(input.createRuntime(executor, deps));
  });
}

export function runPipelineCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineCommandRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runPipelineRuntime({
    createDeps,
    createRuntime: (executor, deps) => ({
      deps,
      auditService: createPipelineAuditServiceRuntime(executor),
    }),
    operation,
  });
}

export function runPipelineNotificationCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineNotificationRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runPipelineRuntime({
    createDeps,
    createRuntime: (executor, deps) => ({
      deps,
      auditService: createPipelineAuditServiceRuntime(executor),
      notificationCenter: createPipelineNotificationCenter(executor),
    }),
    operation,
  });
}

export function runPipelineRegistrationCommand<TDeps, TResult>(
  createDeps: (executor: DatabaseExecutor) => TDeps,
  operation: (runtime: PipelineRegistrationRuntime<TDeps>) => Promise<TResult>,
): Promise<TResult> {
  return runPipelineRuntime({
    createDeps,
    createRuntime: (executor, deps) => ({
      deps,
      auditService: createPipelineAuditServiceRuntime(executor),
      engineGateway: createEngineGateway(),
    }),
    operation,
  });
}
