import { query } from "@solidjs/router";

import type { BookFilter, Page } from "~/contracts/merchant-stats/views";
import { getCohortRows } from "~/server/merchant-stats/ui/dashboard";

export const cohortRowsQuery = query(
  async (input: { filter: BookFilter; page: Page }) => {
    "use server";
    return getCohortRows(input);
  },
  "merchant-stats.cohort-rows",
);
