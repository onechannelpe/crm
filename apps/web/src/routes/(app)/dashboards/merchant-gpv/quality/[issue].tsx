import { type RouteDefinition } from "@solidjs/router";

import { isQualityIssue } from "~/contracts/merchant-stats/vocabulary";
import {
  merchantFilterOptionsQuery,
  qualityRowsQuery,
} from "~/features/dashboards/data/queries";
import { GPV_GRID_PAGE_SIZE } from "~/features/dashboards/grids/use-dashboard-grid";
import { QualityPage } from "~/features/dashboards/quality/quality-page";

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
