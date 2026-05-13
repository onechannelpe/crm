import type { EngineClient } from "~/server/shared/engine/client";
import { createEngineGateway } from "~/server/workflow/infrastructure/engine-gateway";
import { createWorkflowModule } from "~/server/workflow/module";

import type { WorkflowFilesRuntime } from "./files-runtime";
import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
  files: WorkflowFilesRuntime,
) {
  return createWorkflowModule({
    executor: infra.db,
    engineGateway: createEngineGateway(engine),
    files,
  });
}
