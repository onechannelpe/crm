import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createUsersRepo } from "~/server/users/repos-users";

import { createIntegrationJobRepo } from "../integrations/infrastructure/integration-job-repo";
import { createJobBlobStore } from "../integrations/job-blob-store";
import { createLeadAssignmentRepo } from "../leads/infrastructure/lead-assignment-repo";
import { createLeadCommercialInputRepo } from "../leads/infrastructure/lead-commercial-input-repo";
import { createLeadRepo } from "../leads/infrastructure/lead-repo";
import { createAppNotificationCenter } from "../notifications/app-center-service";
import { createQuotationRepo } from "../quotations/infrastructure/quotation-repo";
import { createSaleRepo } from "../sales/infrastructure/sale-repo";
import { createAuditService } from "./audit";
import type { DatabaseExecutor } from "./db-executor";
import { createAuditLogsRepo } from "./repos-audit-logs";

export function createPipelineRepos(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadCommercialInputs: createLeadCommercialInputRepo(executor),
    leadAssignments: createLeadAssignmentRepo(executor),
    quotations: createQuotationRepo(executor),
    sales: createSaleRepo(executor),
    integrationJobs: createIntegrationJobRepo(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
    appNotifications: createAppNotificationsRepo(executor),
  };
}

export type PipelineRepos = ReturnType<typeof createPipelineRepos>;

export const pipelineRepos = createPipelineRepos(db);
export const pipelineAuditService = createAuditService({
  auditLogs: pipelineRepos.auditLogs,
});
export const jobBlobStore = createJobBlobStore(config.uploads.storageRoot);
export const pipelineNotificationCenter = createAppNotificationCenter({
  repos: {
    appNotifications: pipelineRepos.appNotifications,
    users: pipelineRepos.users,
  },
});
