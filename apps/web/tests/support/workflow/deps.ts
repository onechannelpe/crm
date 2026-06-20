import { noopQueueDoorbell } from "~/lib/job-queue/doorbell";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEngineGateway } from "~/server/workflow/lead/write/engine-gateway";
import { createWorkflowRepos } from "~/server/workflow/repos";

import type { TestRuntime } from "../runtime/app";

export function workflowRepos(runtime: TestRuntime) {
  return createWorkflowRepos(runtime.ctx.db);
}

export function workflowCommandPorts(runtime: TestRuntime) {
  return {
    executor: runtime.ctx.db,
    now: runtime.now.get(),
  };
}

export function registerLeadPorts(runtime: TestRuntime) {
  const repos = workflowRepos(runtime);
  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(runtime.ctx.db),
    noopQueueDoorbell,
  );

  return {
    ...workflowCommandPorts(runtime),
    leads: repos.leads,
    users: repos.users,
    engineGateway: createEngineGateway(runtime.engine.client),
    enrichmentQueue: {
      enqueueRucVerification: async (
        ruc: string,
        requestedByUserId: number,
      ): Promise<void> => {
        await enrichmentCommand.enqueueRequest(
          "ruc",
          ruc,
          requestedByUserId,
          runtime.now.get(),
        );
      },
    },
  };
}
