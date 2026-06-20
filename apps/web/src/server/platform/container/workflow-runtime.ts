import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createSunatEnrichmentWritebackQueue } from "~/server/identity/enrichment/writeback-queue";
import type { EngineClient } from "~/server/shared/engine/client";
import { createLeadArtifactsService } from "~/server/workflow/lead/read/lead-artifacts";
import { createEngineGateway } from "~/server/workflow/lead/write/engine-gateway";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";
import { createWorkflowRepos } from "~/server/workflow/repos";

import type { FilesRuntime } from "./files-runtime";
import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
  files: Pick<FilesRuntime, "repo" | "storage">,
  doorbell: QueueDoorbell,
) {
  const engineGateway = createEngineGateway(engine);
  const repos = createWorkflowRepos(infra.db);
  const leadRepo = createLeadRepo(infra.db);

  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(infra.db),
    doorbell,
  );

  const enrichmentQueue = {
    enqueueRucVerification: async (
      ruc: string,
      requestedByUserId: number,
    ): Promise<void> => {
      await enrichmentCommand.enqueueRequest(
        "ruc",
        ruc,
        requestedByUserId,
        infra.now(),
      );
    },
  };

  return {
    db: infra.db,
    now: infra.now,
    repos,
    engineGateway,
    enrichmentQueue,
    leadArtifacts: createLeadArtifactsService({
      leadReader: leadRepo,
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
