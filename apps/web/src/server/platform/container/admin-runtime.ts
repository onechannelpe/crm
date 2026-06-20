import { createAuditActionPoliciesRepo } from "~/server/shared/repos-audit-action-policies";
import { createEventsRepo } from "~/server/shared/repos-events";

import type { ServerInfra } from "./infra";

export function createAdminRuntime(infra: ServerInfra) {
  return {
    events: createEventsRepo(infra.db),
    auditActionPolicies: createAuditActionPoliciesRepo(infra.db),
  };
}
