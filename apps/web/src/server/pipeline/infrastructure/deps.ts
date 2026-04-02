import { db } from "~/lib/db/db";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAppNotificationCenter } from "../../notifications/app-center-service";
import { createAuditService } from "../../shared/audit";
import type { DatabaseExecutor } from "../../shared/db-executor";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import { createAssignmentRepo } from "./assignment-repo";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createEngineGateway } from "./engine-gateway";
import { createHistoryRepo } from "./history-repo";
import { createLeadRepo } from "./lead-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";

export function createPipelineDeps(executor: DatabaseExecutor) {
  return {
    leads: createLeadRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
  };
}

export type PipelineDeps = ReturnType<typeof createPipelineDeps>;

export function createPipelineQueryDeps() {
  return createPipelineDeps(db);
}

export function createPipelineAuditService(
  deps: Pick<PipelineDeps, "auditLogs">,
) {
  return createAuditService({ auditLogs: deps.auditLogs });
}

export function createPipelineNotificationCenter(
  executor: DatabaseExecutor = db,
) {
  return createAppNotificationCenter({
    repos: {
      appNotifications: createAppNotificationsRepo(executor),
      users: createUsersRepo(executor),
    },
  });
}

export function createPipelineEngineGateway() {
  return createEngineGateway();
}
