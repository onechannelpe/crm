import type { WorkflowDeps } from "~/server/features/workflow/application/workflow-deps";

import {
  createWorkflowQueryApi,
  type WorkflowQueryApi,
} from "../../application/query-api";

export function createWorkflowQueryApiRuntime(
  deps: WorkflowDeps,
): WorkflowQueryApi {
  return createWorkflowQueryApi({
    leadDetail: deps.leadDetail,
    assignableExecutives: deps.assignableExecutives,
  });
}
