import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";

import type { ServerInfra } from "./infra";

export function createAdminRuntime(infra: ServerInfra) {
  return {
    events: createEventsRepo(infra.db),
    auditActionPolicies: createAuditActionPoliciesRepo(infra.db),
  };
}
