import { query } from "@solidjs/router";

import { getMySearchAllowance } from "~/server/search/ui/queries";

export const mySearchAllowanceQuery = query(async () => {
  "use server";
  return getMySearchAllowance();
}, "capacity.my-search-allowance");
