import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import type { OrganizationEnrichmentQueue } from "~/server/organization/enrichment";
import type { EngineClient } from "~/server/shared/engine/client";
import { createLeadFilesService } from "~/server/workflow/lead/files/lead-files";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";
import { createWorkflowRepos } from "~/server/workflow/repos";

import type { FilesRuntime } from "./files-runtime";
import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
  files: Pick<FilesRuntime, "repo" | "storage">,
) {
  const organizationEnrichment = createOrganizationEnrichment(engine);
  const repos = createWorkflowRepos(infra.db);
  const leadRepo = createLeadRepo(infra.db);

  const enrichmentCommand = createEnrichmentCommand(
    createCompanyRegistryRepo(infra.db),
  );

  const enrichmentQueue: OrganizationEnrichmentQueue = {
    enqueueRucVerification: async (ruc, requestedByUserId): Promise<void> => {
      await enrichmentCommand.enqueueRequest(
        { kind: "ruc", value: ruc },
        requestedByUserId,
        infra.now(),
      );
    },
  };

  return {
    now: infra.now,
    ports: () => ({ executor: infra.db, now: infra.now() }),
    repos,
    organizationEnrichment,
    enrichmentQueue,
    leadFiles: createLeadFilesService({
      leadReader: leadRepo,
      leadQueries: repos.leadQueries,
      fulfillment: repos.fulfillment,
      filesRepo: files.repo,
      filesStorage: files.storage,
      workflowPorts: () => ({ executor: infra.db, now: infra.now() }),
    }),
  };
}
