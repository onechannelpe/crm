import { query } from "@solidjs/router";

type GetGpvCulqi =
  (typeof import("~/actions/merchant-stats/dashboard.action"))["getGpvCulqi"];

export const gpvCulqiViewQuery = query(
  async (...args: Parameters<GetGpvCulqi>) => {
    "use server";

    const { getGpvCulqi } =
      await import("~/actions/merchant-stats/dashboard.action");
    return getGpvCulqi(...args);
  },
  "merchant-stats.gpv-culqi",
);
