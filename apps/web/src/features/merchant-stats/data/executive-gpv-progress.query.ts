import { query } from "@solidjs/router";

type GetExecutiveGpvProgress =
  (typeof import("~/actions/merchant-stats/executive-progress.action"))["getExecutiveGpvProgress"];

export const executiveGpvProgressQuery = query(
  async (...args: Parameters<GetExecutiveGpvProgress>) => {
    "use server";

    const { getExecutiveGpvProgress } =
      await import("~/actions/merchant-stats/executive-progress.action");
    return getExecutiveGpvProgress(...args);
  },
  "merchant-stats.executive-progress",
);
