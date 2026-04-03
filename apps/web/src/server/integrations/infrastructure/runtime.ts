import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createLeadExportQuery } from "~/server/pipeline/infrastructure/lead-export-query";
import { createLeadsRepo } from "~/server/pipeline/infrastructure/leads-repo";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import { createJobBlobStore } from "../job-blob-store";
import { createIntegrationJobRepo } from "./integration-job-repo";

export function createIntegrationRuntime(executor = db) {
  return {
    jobs: createIntegrationJobRepo(executor),
    leads: createLeadsRepo(executor),
    leadExportQuery: createLeadExportQuery(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
  };
}

export type IntegrationRuntime = ReturnType<typeof createIntegrationRuntime>;

export const integrationRuntime = createIntegrationRuntime();
export const integrationJobBlobStore = createJobBlobStore(
  config.uploads.storageRoot,
);
