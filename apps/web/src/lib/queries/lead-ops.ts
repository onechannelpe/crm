import { query } from "@solidjs/router";

import {
  getManagedExecutiveLeadCapacity,
  getMyLeadCapacity,
} from "~/actions/lead-ops/read";

export const myLeadCapacityQuery = query(getMyLeadCapacity, "myLeadCapacity");

export const managedExecutiveLeadCapacityQuery = query(
  getManagedExecutiveLeadCapacity,
  "managedExecutiveLeadCapacity",
);
