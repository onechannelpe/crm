import { createOrganizationEnrichment } from "~/server/organization/enrichment";
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
  return {
    ...workflowCommandPorts(runtime),
    identity: createOrganizationEnrichment(runtime.engine.client),
  };
}
