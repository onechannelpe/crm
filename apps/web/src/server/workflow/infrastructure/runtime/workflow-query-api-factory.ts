import type { WorkflowDeps } from "~/server/features/workflow/application/workflow-deps";

import {
  createWorkflowQueryApi,
  type PipelineQueryApi,
} from "../../application/query-api";

export function createWorkflowQueryApiRuntime(
  deps: WorkflowDeps,
): PipelineQueryApi {
  return createWorkflowQueryApi({
    leadDetail: deps.leadDetail,
    assignableExecutives: deps.assignableExecutives,
  });
}
