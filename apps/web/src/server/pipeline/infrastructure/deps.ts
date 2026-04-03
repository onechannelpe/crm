import { db } from "~/lib/db/db";

import type { DatabaseExecutor } from "../../shared/db-executor";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import { createAssignmentRepo } from "./assignment-repo";
import { createPipelineAuditLogRepo } from "./audit-log";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createEngineGateway } from "./engine-gateway";
import { createHistoryRepo } from "./history-repo";
import { createLeadsRepo } from "./leads-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createPipelineUsersRepo } from "./users-repo";

export function createPipelineCommandDeps(executor: DatabaseExecutor) {
  return {
    leads: createLeadsRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: createPipelineUsersRepo(executor),
    auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
  };
}

export function createPipelineQueryDeps(executor: DatabaseExecutor = db) {
  return {
    leads: createLeadsRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
  };
}

export function createPipelineEngineGateway() {
  return createEngineGateway();
}
