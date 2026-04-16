import type { PipelineDeps } from "~/server/features/pipeline/application/pipeline-deps";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createPipelineCommandApi,
  type PipelineCommandApi,
} from "../../application/command-api";
import type { PipelineNotificationCenter } from "../../application/ports/notification-center";
import { systemLeadClock } from "../../application/services/lead-clock";
import { createLeadMutationUow } from "../repos/lead-mutation-uow";
import { createLeadReadRepository } from "../repos/lead-read-repo";
import { createLeadUserScopeRepository } from "../repos/lead-user-scope-repo";

export function createPipelineCommandApiRuntime(input: {
  deps: PipelineDeps;
  executor: DatabaseExecutor;
  notificationCenter: PipelineNotificationCenter;
}): PipelineCommandApi {
  return createPipelineCommandApi({
    leadReader: createLeadReadRepository(input.deps.leadMutations.leads),
    mutationUow: createLeadMutationUow(input.executor),
    users: createLeadUserScopeRepository(input.deps.leadMutations.users),
    notificationCenter: input.notificationCenter,
    clock: systemLeadClock,
  });
}
