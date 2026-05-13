import { createWorkflowApp } from "~/server/workflow/application/app";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  return createWorkflowApp({
    executor: infra.db,
    engineGateway,
  });
}
