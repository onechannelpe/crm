import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import { createWorkflowCommandDeps } from "./application/create-workflow-command-deps";
import { createWorkflowCommands } from "./application/create-workflow-commands";
import { createWorkflowQueries } from "./application/create-workflow-queries";
import { createWorkflowRepos } from "./infrastructure/workflow-repos";

export function createWorkflowModule(input: {
  executor: DatabaseExecutor;
  engineGateway: WorkflowEngineGateway;
}) {
  const repos = createWorkflowRepos(input.executor);
  const commandDeps = createWorkflowCommandDeps(
    input.executor,
    repos,
    input.engineGateway,
  );

  return {
    repos,
    engineGateway: input.engineGateway,
    commands: createWorkflowCommands(commandDeps, input.executor),
    queries: createWorkflowQueries(repos, input.engineGateway),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: input.executor,
      }),
  };
}

export type WorkflowModule = ReturnType<typeof createWorkflowModule>;
