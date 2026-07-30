import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createAdminRuntime(infra: ServerInfra) {
  return {
    events: createEventsRepo(infra.db),
    auditActionPolicies: createAuditActionPoliciesRepo(infra.db),
  };
}

export const getAdminRuntime = memo(() => createAdminRuntime(infra));
