import { query } from "@solidjs/router";

import {
  getCapacityPolicyDefaults,
  getExecutiveCapacityDetail,
  getManagedExecutives,
  getPendingCapacityRequests,
} from "~/actions/capacity/read";

export const managedExecutivesQuery = query(
  getManagedExecutives,
  "managedExecutives",
);
export const executiveCapacityDetailQuery = query(
  getExecutiveCapacityDetail,
  "executiveCapacityDetail",
);
export const pendingCapacityRequestsQuery = query(
  getPendingCapacityRequests,
  "pendingCapacityRequests",
);
export const capacityPolicyDefaultsQuery = query(
  getCapacityPolicyDefaults,
  "capacityPolicyDefaults",
);
