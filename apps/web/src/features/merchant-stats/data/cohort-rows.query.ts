import { query } from "@solidjs/router";

type GetCohortRows =
  (typeof import("~/actions/merchant-stats/dashboard.action"))["getCohortRows"];

export const cohortRowsQuery = query(
  async (...args: Parameters<GetCohortRows>) => {
    "use server";

    const { getCohortRows } =
      await import("~/actions/merchant-stats/dashboard.action");
    return getCohortRows(...args);
  },
  "merchant-stats.cohort-rows",
);
