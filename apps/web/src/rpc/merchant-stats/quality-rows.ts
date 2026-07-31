import { query } from "@solidjs/router";

import type { Page } from "~/contracts/merchant-stats/views";
import type { QualityIssue } from "~/contracts/merchant-stats/vocabulary";
import { getQualityRows } from "~/server/merchant-stats/ui/quality";

export const qualityRowsQuery = query(
  async (input: { issue: QualityIssue; page: Page }) => {
    "use server";
    return getQualityRows(input);
  },
  "merchant-stats.quality-rows",
);
