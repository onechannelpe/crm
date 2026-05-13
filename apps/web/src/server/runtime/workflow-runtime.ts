import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { EngineClient } from "~/server/shared/engine/client";
import { createWorkflowCommandDeps } from "~/server/workflow/application/create-workflow-command-deps";
import { createWorkflowCommands } from "~/server/workflow/application/create-workflow-commands";
import { createWorkflowQueries } from "~/server/workflow/application/create-workflow-queries";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import { createEngineGateway } from "~/server/workflow/infrastructure/engine-gateway";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntimeWithGateway(input: {
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

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  return createWorkflowRuntimeWithGateway({
    executor: infra.db,
    engineGateway: createEngineGateway(engine),
  });
}
