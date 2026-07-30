import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createAdminComposition(infra: ServerInfrastructure) {
  return {
    events: createEventsRepo(infra.db),
    auditActionPolicies: createAuditActionPoliciesRepo(infra.db),
  };
}

export function composeAdmin() {
  return createAdminComposition(serverInfrastructure);
}
