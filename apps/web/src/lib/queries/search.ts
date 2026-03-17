import { query } from "@solidjs/router";

import { getMySearchAllowance } from "~/actions/search/read";

export const mySearchAllowanceQuery = query(
  getMySearchAllowance,
  "mySearchAllowance",
);
