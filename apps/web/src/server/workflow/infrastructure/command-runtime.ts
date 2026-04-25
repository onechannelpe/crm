import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import {
  createWorkflowFeatureDeps,
  type WorkflowDeps,
} from "~/server/features/workflow/application/workflow-deps";
import { getServerRuntime } from "~/server/runtime";
import type { EngineClient } from "~/server/shared/engine/client";

import type { DatabaseExecutor } from "../../shared/db-executor";
import { runInWorkflowTransaction } from "../../shared/workflow-transaction";
import type { WorkflowAuditService } from "../application/ports/audit-service";
import type { WorkflowEngineGateway } from "../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../application/ports/enrichment-queue";
import type { WorkflowNotificationCenter } from "../application/ports/notification-center";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "./audit-log";
import { createEngineGateway } from "./engine-gateway";
import { createWorkflowNotificationCenter } from "./notifications";

export type WorkflowCommandRuntime = {
  executor: DatabaseExecutor;
  deps: WorkflowDeps;
  auditService: WorkflowAuditService;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  notificationCenter: WorkflowNotificationCenter;
};

function createWorkflowAuditServiceRuntime(executor: DatabaseExecutor) {
  return createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });
}

function createWorkflowCommandRuntime(
  executor: DatabaseExecutor,
  engine: EngineClient,
): WorkflowCommandRuntime {
  const enrichmentRepo = createSearchEnrichmentRepo(executor);
  const enrichmentCommand = createEnrichmentCommand(enrichmentRepo);

  return {
    executor,
    deps: createWorkflowFeatureDeps(executor, engine),
    auditService: createWorkflowAuditServiceRuntime(executor),
    engineGateway: createEngineGateway(engine),
    leadEnrichmentQueue: {
      async enqueueRucVerification(ruc, requestedByUserId) {
        await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
      },
    },
    notificationCenter: createWorkflowNotificationCenter(executor),
  };
}

export async function runWorkflowCommand<TResult>(
  operation: (runtime: WorkflowCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  const { engine } = getServerRuntime().infra;
  return runInWorkflowTransaction(async ({ executor }) =>
    operation(createWorkflowCommandRuntime(executor, engine)),
  );
}
