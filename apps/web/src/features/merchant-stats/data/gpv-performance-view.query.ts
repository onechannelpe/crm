import { query } from "@solidjs/router";

type GetGpvPerformance =
  (typeof import("~/actions/merchant-stats/dashboard.action"))["getGpvPerformance"];

export const gpvPerformanceViewQuery = query(
  async (...args: Parameters<GetGpvPerformance>) => {
    "use server";

    const { getGpvPerformance } =
      await import("~/actions/merchant-stats/dashboard.action");
    return getGpvPerformance(...args);
  },
  "merchant-stats.gpv-performance",
);
