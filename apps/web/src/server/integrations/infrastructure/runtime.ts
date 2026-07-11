import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";
import { createLeadQueries } from "~/server/workflow/lead/read/lead-queries";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";

import type { IntegrationRuntime } from "../types";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(input: {
  executor: DatabaseExecutor;
  now: () => Date;
}): IntegrationRuntime {
  const { executor } = input;

  return {
    executor,
    now: input.now,
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadRepo(executor),
    recordExportQuery: createLeadQueries(executor),
    users: createUsersRepo(executor),
  };
}
