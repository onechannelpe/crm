import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createAdminComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  return {
    events: createEventsRepo(serverInfrastructure.db),
    auditActionPolicies: createAuditActionPoliciesRepo(serverInfrastructure.db),
  };
}

export function composeAdmin() {
  return createAdminComposition(serverInfrastructure);
}
