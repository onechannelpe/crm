import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createSunatEnrichmentWritebackQueue } from "~/server/identity/enrichment/writeback-queue";
import { createOrganizationEnrichment } from "~/server/identity/organization/enrichment";
import type { OrganizationEnrichmentQueue } from "~/server/identity/organization/enrichment";
import type { EngineClient } from "~/server/shared/engine/client";
import { createLeadArtifactsService } from "~/server/workflow/lead/read/lead-artifacts";
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
  const organizationEnrichment = createOrganizationEnrichment(engine);
  const repos = createWorkflowRepos(infra.db);
  const leadRepo = createLeadRepo(infra.db);

  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(infra.db),
    doorbell,
  );

  const enrichmentQueue: OrganizationEnrichmentQueue = {
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
    now: infra.now,
    // Lead commands take their executor only through here; runLeadTransaction
    // opens its own transaction from it. No raw db handle is exposed, so a
    // command cannot hand-roll its own transaction ports.
    ports: () => ({ executor: infra.db, now: infra.now() }),
    repos,
    organizationEnrichment,
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
