import type { PipelineDeps } from "~/server/features/pipeline/application/pipeline-deps";

import {
  createPipelineQueryApi,
  type PipelineQueryApi,
} from "../../application/query-api";

export function createPipelineQueryApiRuntime(
  deps: PipelineDeps,
): PipelineQueryApi {
  return createPipelineQueryApi({
    leadDetail: deps.leadDetail,
    assignableExecutives: deps.assignableExecutives,
  });
}
