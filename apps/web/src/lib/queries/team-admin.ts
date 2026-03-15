import { query } from "@solidjs/router";

import {
  getAllowanceRequests,
  getExecutiveCapacityDetail,
  getManagedExecutives,
  getSalesPolicyDefaults,
} from "~/actions/team-admin/read";

export const managedExecutivesQuery = query(
  getManagedExecutives,
  "managedExecutives",
);

export const executiveCapacityDetailQuery = query(
  getExecutiveCapacityDetail,
  "executiveCapacityDetail",
);

export const allowanceRequestsQuery = query(
  getAllowanceRequests,
  "allowanceRequests",
);

export const salesPolicyDefaultsQuery = query(
  getSalesPolicyDefaults,
  "salesPolicyDefaults",
);
