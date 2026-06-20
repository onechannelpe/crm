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
  return {
    ...workflowCommandPorts(runtime),
    identity: createEngineGateway(runtime.engine.client),
  };
}
