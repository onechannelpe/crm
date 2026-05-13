import type {
  ArtifactRepos,
  SyncExecutor,
} from "~/server/files/service/contracts";
import type { FileStorage } from "~/server/files/storage";
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
  files: {
    repo: ArtifactRepos;
    storage: FileStorage;
    syncExecutor: SyncExecutor;
  };
}) {
  const repos = createWorkflowRepos(input.executor);
  const commandDeps = createWorkflowCommandDeps(
    input.executor,
    repos,
    input.engineGateway,
    input.files,
  );

  return {
    repos,
    engineGateway: input.engineGateway,
    commands: createWorkflowCommands(commandDeps),
    queries: createWorkflowQueries(repos, input.engineGateway),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: input.executor,
      }),
  };
}

export type WorkflowModule = ReturnType<typeof createWorkflowModule>;
