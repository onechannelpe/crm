import { query } from "@solidjs/router";

import {
  getAuditEvents,
  getExecutiveDetail,
  getManagedExecutivesList,
  getPendingRequests,
  getPolicyDefaults,
} from "~/actions/capacity/read";

export const managedExecutivesQuery = query(
  getManagedExecutivesList,
  "managedExecutives",
);
export const executiveCapacityDetailQuery = query(
  getExecutiveDetail,
  "executiveCapacityDetail",
);
export const pendingCapacityRequestsQuery = query(
  getPendingRequests,
  "pendingCapacityRequests",
);
export const capacityPolicyDefaultsQuery = query(
  getPolicyDefaults,
  "capacityPolicyDefaults",
);
export const capacityAuditEventsQuery = query(
  getAuditEvents,
  "capacityAuditEvents",
);
