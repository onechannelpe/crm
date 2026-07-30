import { query } from "@solidjs/router";

type GetQualityRows =
  (typeof import("~/actions/merchant-stats/quality.action"))["getQualityRows"];

export const qualityRowsQuery = query(
  async (...args: Parameters<GetQualityRows>) => {
    "use server";

    const { getQualityRows } =
      await import("~/actions/merchant-stats/quality.action");
    return getQualityRows(...args);
  },
  "merchant-stats.quality-rows",
);
