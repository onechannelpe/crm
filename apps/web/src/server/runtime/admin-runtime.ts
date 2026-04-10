import { createProductsRepo } from "~/server/inventory/repos-products";
import { createAuditActionPoliciesRepo } from "~/server/shared/repos-audit-action-policies";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { ServerInfra } from "./infra";

export function createAdminRuntime(infra: ServerInfra) {
  return {
    auditLogs: createAuditLogsRepo(infra.db),
    auditActionPolicies: createAuditActionPoliciesRepo(infra.db),
    products: createProductsRepo(infra.db),
  };
}
