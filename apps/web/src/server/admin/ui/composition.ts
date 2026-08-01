import "server-only";
import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

function createAdminComposition(serverInfrastructure: ServerInfrastructure) {
  return {
    events: createEventsRepo(serverInfrastructure.db),
    auditActionPolicies: createAuditActionPoliciesRepo(serverInfrastructure.db),
  };
}

export function composeAdmin() {
  return createAdminComposition(defaultServerInfrastructure);
}
