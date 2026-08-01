import type { Clock } from "~/domain/time/clock";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createUsersRepo } from "~/server/users/repos-users";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";

import type { IntegrationRuntime } from "../types";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(input: {
  executor: DatabaseExecutor;
  now: Clock;
}): IntegrationRuntime {
  const { executor } = input;

  return {
    executor,
    now: input.now,
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadRepo(executor),
    users: createUsersRepo(executor),
  };
}
