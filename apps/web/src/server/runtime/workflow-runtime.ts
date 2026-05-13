import type { EngineClient } from "~/server/shared/engine/client";
import { createWorkflowBusinessCommands } from "~/server/workflow/application/create-workflow-business-commands";
import { createWorkflowCommandDeps } from "~/server/workflow/application/create-workflow-command-deps";
import { createWorkflowQueries } from "~/server/workflow/application/create-workflow-queries";
import { createLeadArtifactsService } from "~/server/workflow/application/services/lead-artifacts";
import { createEngineGateway } from "~/server/workflow/infrastructure/engine-gateway";
import { createLeadRepo } from "~/server/workflow/infrastructure/lead-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { FilesRuntime } from "./files-runtime";
import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
  files: Pick<FilesRuntime, "repo" | "storage" | "syncExecutor">,
) {
  const engineGateway = createEngineGateway(engine);
  const repos = createWorkflowRepos(infra.db);
  const commandDeps = createWorkflowCommandDeps(infra.db, repos, engineGateway);

  return {
    repos,
    engineGateway,
    commands: createWorkflowBusinessCommands(commandDeps),
    queries: createWorkflowQueries(repos, engineGateway),
    leadArtifacts: createLeadArtifactsService({
      leadReader: createLeadRepo(infra.db),
      filesRepo: files.repo,
      filesStorage: files.storage,
      filesSyncExecutor: files.syncExecutor,
    }),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
