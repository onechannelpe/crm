import "server-only";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import {
  composeFiles,
  type FilesComposition,
} from "~/server/files/ui/composition";
import type { EngineClient } from "~/server/integrations/engine/client";
import { composeEngineClient } from "~/server/integrations/ui/engine-client";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import type { OrganizationEnrichmentQueue } from "~/server/organization/enrichment";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import { createLeadFilesService } from "~/server/workflow/lead/files/lead-files";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";
import { createWorkflowRepos } from "~/server/workflow/repos";

export function createWorkflowComposition(
  serverInfrastructure: ServerInfrastructure,
  engine: EngineClient,
  files: Pick<FilesComposition, "repo" | "storage">,
) {
  const organizationEnrichment = createOrganizationEnrichment(engine);
  const repos = createWorkflowRepos(serverInfrastructure.db);
  const leadRepo = createLeadRepo(serverInfrastructure.db);

  const enrichmentCommand = createEnrichmentCommand(
    createCompanyRegistryRepo(serverInfrastructure.db),
  );

  const enrichmentQueue: OrganizationEnrichmentQueue = {
    enqueueRucVerification: async (ruc, requestedByUserId): Promise<void> => {
      await enrichmentCommand.enqueueRequest(
        { kind: "ruc", value: ruc },
        requestedByUserId,
        serverInfrastructure.now(),
      );
    },
  };

  return {
    now: serverInfrastructure.now,
    ports: () => ({
      executor: serverInfrastructure.db,
      now: serverInfrastructure.now(),
    }),
    repos,
    organizationEnrichment,
    enrichmentQueue,
    leadFiles: createLeadFilesService({
      leadReader: leadRepo,
      leadQueries: repos.leadQueries,
      fulfillment: repos.fulfillment,
      filesRepo: files.repo,
      filesStorage: files.storage,
      workflowPorts: () => ({
        executor: serverInfrastructure.db,
        now: serverInfrastructure.now(),
      }),
    }),
  };
}

export function composeWorkflow() {
  return createWorkflowComposition(
    defaultServerInfrastructure,
    composeEngineClient(),
    composeFiles(),
  );
}
