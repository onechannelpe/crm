import {
  createPipelineFeatureDeps,
  type PipelineDeps,
} from "~/server/features/pipeline/application/pipeline-deps";

import type { DatabaseExecutor } from "../../shared/db-executor";

export type { PipelineDeps };

export function createPipelineDeps(executor: DatabaseExecutor): PipelineDeps {
  return createPipelineFeatureDeps(executor);
}
