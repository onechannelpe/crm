import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";
import { createLeadQueries } from "~/server/workflow/infrastructure/lead-queries";
import { createLeadRepo } from "~/server/workflow/infrastructure/lead-repo";

import type { IntegrationRuntime } from "../types";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(
  executor: DatabaseExecutor,
): IntegrationRuntime {
  return {
    executor,
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadRepo(executor),
    leadExportQuery: createLeadQueries(executor),
    users: createUsersRepo(executor),
  };
}
