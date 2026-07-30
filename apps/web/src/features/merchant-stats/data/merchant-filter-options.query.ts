import { query } from "@solidjs/router";

type GetFilterOptions =
  (typeof import("~/actions/merchant-stats/dashboard.action"))["getFilterOptions"];

export const merchantFilterOptionsQuery = query(
  async (...args: Parameters<GetFilterOptions>) => {
    "use server";

    const { getFilterOptions } =
      await import("~/actions/merchant-stats/dashboard.action");
    return getFilterOptions(...args);
  },
  "merchant-stats.filter-options",
);
