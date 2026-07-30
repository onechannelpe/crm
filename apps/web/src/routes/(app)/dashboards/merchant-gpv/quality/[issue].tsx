import { type RouteDefinition } from "@solidjs/router";

import { isQualityIssue } from "~/contracts/merchant-stats/vocabulary";
import { merchantFilterOptionsQuery } from "~/features/merchant-stats/data/merchant-filter-options.query";
import { qualityRowsQuery } from "~/features/merchant-stats/data/quality-rows.query";
import { GPV_GRID_PAGE_SIZE } from "~/features/merchant-stats/grids/use-dashboard-grid";
import { QualityPage } from "~/features/merchant-stats/quality/quality-page";

export const route = {
  preload: ({ params }) => {
    void merchantFilterOptionsQuery();
    const issue = params.issue;
    if (issue && isQualityIssue(issue)) {
      void qualityRowsQuery({
        issue,
        page: { limit: GPV_GRID_PAGE_SIZE, offset: 0 },
      });
    }
  },
} satisfies RouteDefinition;

export default function QualityQueueRoute() {
  return <QualityPage />;
}
