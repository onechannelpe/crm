import type { EngineClient } from "~/server/shared/engine/client";
import { createWorkflowBusinessCommands } from "~/server/workflow/application/create-workflow-business-commands";
import { createWorkflowCommandDeps } from "~/server/workflow/application/create-workflow-command-deps";
import { createWorkflowQueries } from "~/server/workflow/application/create-workflow-queries";
import { createEngineGateway } from "~/server/workflow/infrastructure/engine-gateway";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  const engineGateway = createEngineGateway(engine);
  const repos = createWorkflowRepos(infra.db);
  const commandDeps = createWorkflowCommandDeps(infra.db, repos, engineGateway);

  return {
    repos,
    engineGateway,
    commands: createWorkflowBusinessCommands(commandDeps),
    queries: createWorkflowQueries(repos, engineGateway),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
