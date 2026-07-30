import { query } from "@solidjs/router";

type GetMerchantStatsForRuc =
  (typeof import("~/actions/merchant-stats/org-stats.action"))["getMerchantStatsForRuc"];

export const merchantStatsByRucQuery = query(
  async (...args: Parameters<GetMerchantStatsForRuc>) => {
    "use server";

    const { getMerchantStatsForRuc } =
      await import("~/actions/merchant-stats/org-stats.action");
    return getMerchantStatsForRuc(...args);
  },
  "merchant-stats.by-ruc",
);
