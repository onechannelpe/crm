import { query } from "@solidjs/router";

import type { BookFilter } from "~/contracts/merchant-stats/views";
import { getGpvPerformance } from "~/server/merchant-stats/ui/dashboard";

export const gpvPerformanceViewQuery = query(
  async (input: { filter: BookFilter }) => {
    "use server";
    return getGpvPerformance(input);
  },
  "merchant-stats.gpv-performance",
);
