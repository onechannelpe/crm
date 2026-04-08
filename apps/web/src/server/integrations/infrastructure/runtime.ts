import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createLeadExportQuery } from "~/server/pipeline/infrastructure/lead-export-query";
import { createLeadRepo } from "~/server/pipeline/infrastructure/lead-repo";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import { createJobBlobStore } from "../job-blob-store";
import type { IntegrationRuntime } from "../types";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(executor = db): IntegrationRuntime {
  return {
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadRepo(executor),
    leadExportQuery: createLeadExportQuery(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
  };
}

export const integrationRuntime = createIntegrationRuntime();
export const integrationJobBlobStore = createJobBlobStore(
  config.uploads.storageRoot,
);
