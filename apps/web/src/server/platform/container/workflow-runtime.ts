import type { EngineClient } from "~/server/shared/engine/client";
import { createWorkflowCommandBus } from "~/server/workflow/commands";
import { createEngineGateway } from "~/server/workflow/infrastructure/engine-gateway";
import { createLeadRepo } from "~/server/workflow/infrastructure/lead-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createLeadArtifactsService } from "~/server/workflow/lead/read/lead-artifacts";
import { createWorkflowQueryBus } from "~/server/workflow/queries";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { FilesRuntime } from "./files-runtime";
import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
  files: Pick<FilesRuntime, "repo" | "storage">,
) {
  const engineGateway = createEngineGateway(engine);
  const repos = createWorkflowRepos(infra.db);

  return {
    commands: createWorkflowCommandBus(
      infra.db,
      repos,
      engineGateway,
      infra.now,
    ),
    queries: createWorkflowQueryBus(repos, engineGateway),
    leadArtifacts: createLeadArtifactsService({
      leadReader: createLeadRepo(infra.db),
      leadQueries: repos.leadQueries,
      filesRepo: files.repo,
      filesStorage: files.storage,
    }),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
