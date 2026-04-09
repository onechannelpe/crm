import { createLeadExportQuery } from "~/server/pipeline/infrastructure/lead-export-query";
import { createLeadRepo } from "~/server/pipeline/infrastructure/lead-repo";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

import type { IntegrationRuntime } from "../types";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(
  executor: DatabaseExecutor,
): IntegrationRuntime {
  return {
    executor,
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadRepo(executor),
    leadExportQuery: createLeadExportQuery(executor),
    users: createUsersRepo(executor),
  };
}
