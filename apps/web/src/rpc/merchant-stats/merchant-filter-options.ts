import { query } from "@solidjs/router";

import { getFilterOptions } from "~/server/merchant-stats/ui/dashboard";

export const merchantFilterOptionsQuery = query(async () => {
  "use server";
  return getFilterOptions();
}, "merchant-stats.filter-options");
