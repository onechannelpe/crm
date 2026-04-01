import { db } from "~/lib/db/db";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createUsersRepo } from "~/server/users/repos-users";

import { createIntegrationJobRepo } from "../../integrations/infrastructure/integration-job-repo";
import { createAppNotificationCenter } from "../../notifications/app-center-service";
import { createAuditService } from "../../shared/audit";
import type { DatabaseExecutor } from "../../shared/db-executor";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import { createAssignmentRepo } from "./assignment-repo";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createEngineGateway } from "./engine-gateway";
import { createHistoryRepo } from "./history-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createRecordRepo } from "./record-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";

export function createPipelineDeps(executor: DatabaseExecutor) {
  return {
    records: createRecordRepo(executor),
    assignments: createAssignmentRepo(executor),
    history: createHistoryRepo(executor),
    commercialInputs: createCommercialInputRepo(executor),
    quotations: createQuotationRepo(executor),
    sales: createSaleRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
    integrationJobs: createIntegrationJobRepo(executor),
  };
}

export type PipelineDeps = ReturnType<typeof createPipelineDeps>;

export function createPipelineQueryDeps() {
  return createPipelineDeps(db);
}

export const pipelineQueryDeps = createPipelineQueryDeps();
export const pipelineAuditService = createAuditService({
  auditLogs: pipelineQueryDeps.auditLogs,
});
export const pipelineNotificationCenter = createAppNotificationCenter({
  repos: {
    appNotifications: createAppNotificationsRepo(db),
    users: createUsersRepo(db),
  },
});
export const pipelineEngineGateway = createEngineGateway();
