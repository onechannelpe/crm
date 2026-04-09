import { createPipelineFeatureDeps } from "~/server/features/pipeline/application/pipeline-deps";

import type { ServerInfra } from "./infra";

export function createPipelineRuntime(infra: ServerInfra) {
  return {
    deps: createPipelineFeatureDeps(infra.db),
  };
}
