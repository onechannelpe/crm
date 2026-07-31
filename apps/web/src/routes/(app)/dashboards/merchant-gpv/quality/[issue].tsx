import { type RouteDefinition } from "@solidjs/router";

import { isQualityIssue } from "~/contracts/merchant-stats/vocabulary";
import { GPV_GRID_PAGE_SIZE } from "~/features/merchant-stats/grids/use-dashboard-grid";
import { QualityPage } from "~/features/merchant-stats/quality/quality-page";
import { merchantFilterOptionsQuery } from "~/rpc/merchant-stats/merchant-filter-options.query";
import { qualityRowsQuery } from "~/rpc/merchant-stats/quality-rows.query";

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
