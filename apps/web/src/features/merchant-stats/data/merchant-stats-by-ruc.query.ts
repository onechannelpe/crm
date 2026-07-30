import { query } from "@solidjs/router";

import { getMerchantStatsForRuc } from "~/server/merchant-stats/ui/org-stats";

export const merchantStatsByRucQuery = query(
  async (ruc: string) => {
    "use server";
    return getMerchantStatsForRuc(ruc);
  },
  "merchant-stats.by-ruc",
);
