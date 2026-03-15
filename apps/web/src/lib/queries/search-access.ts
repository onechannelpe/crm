import { query } from "@solidjs/router";

import { getManagedExecutiveSearchAllowance, getMySearchAllowance } from "~/actions/search-access/read";

export const mySearchAllowanceQuery = query(
  getMySearchAllowance,
  "mySearchAllowance",
);

export const managedExecutiveSearchAllowanceQuery = query(
  getManagedExecutiveSearchAllowance,
  "managedExecutiveSearchAllowance",
);
