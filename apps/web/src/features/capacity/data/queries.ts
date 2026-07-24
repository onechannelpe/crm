import { query } from "@solidjs/router";

import {
  getExecutiveDetail,
  getManagedExecutivesList,
  getPendingRequests,
  getPolicyDefaults,
} from "~/actions/capacity/read";
import { getMyContactAssignmentCapacity } from "~/actions/contact-assignments/read";
import { getMySearchAllowance } from "~/actions/search/read";

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

export const myContactAssignmentCapacityQuery = query(
  getMyContactAssignmentCapacity,
  "myContactAssignmentCapacity",
);

export const mySearchAllowanceQuery = query(
  getMySearchAllowance,
  "mySearchAllowance",
);
