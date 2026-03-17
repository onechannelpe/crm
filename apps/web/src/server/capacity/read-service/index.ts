import type { SessionData } from "~/lib/auth/access/session";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";

import { listCapacityAuditEvents } from "./audit-events";
import { getExecutiveCapacityDetail } from "./executive-detail";
import { listManagedExecutives } from "./managed-executives";
import { listPendingCapacityRequests } from "./pending-requests";
import { getCapacityPolicyDefaults } from "./policy-defaults";

export type {
  CapacityAuditEvent,
  CapacityPolicyDefaults,
  ExecutiveCapacityDetail,
  ManagedExecutiveSummary,
} from "./contracts";

interface CapacityReadServiceDeps {
  repos: Repositories;
}

export function createCapacityReadService(deps: CapacityReadServiceDeps) {
  const { repos } = deps;

  return {
    listManagedExecutives(session: SessionData) {
      return listManagedExecutives(repos, session);
    },

    getExecutiveCapacityDetail(session: SessionData, targetUserId: UserId) {
      return getExecutiveCapacityDetail(repos, session, targetUserId);
    },

    listPendingCapacityRequests(session: SessionData) {
      return listPendingCapacityRequests(repos, session);
    },

    getCapacityPolicyDefaults(session: SessionData) {
      return getCapacityPolicyDefaults(repos, session);
    },

    listCapacityAuditEvents(session: SessionData, limit?: number) {
      return listCapacityAuditEvents(repos, session, limit);
    },
  };
}
