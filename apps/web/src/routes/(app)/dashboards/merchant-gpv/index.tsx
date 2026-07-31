import { type RouteDefinition } from "@solidjs/router";

import { readGpvFilter, readGpvTab } from "~/features/merchant-stats/gpv-view";
import { GPV_GRID_PAGE_SIZE } from "~/features/merchant-stats/grids/use-dashboard-grid";
import { MerchantGpvDashboard } from "~/features/merchant-stats/merchant-gpv-dashboard";
import { cohortRowsQuery } from "~/rpc/merchant-stats/cohort-rows.query";
import { gpvCulqiViewQuery } from "~/rpc/merchant-stats/gpv-culqi-view.query";
import { gpvPerformanceViewQuery } from "~/rpc/merchant-stats/gpv-performance-view.query";
import { merchantFilterOptionsQuery } from "~/rpc/merchant-stats/merchant-filter-options.query";

export const route = {
  preload: ({ location }) => {
    const filter = readGpvFilter(location.query);
    const tab = readGpvTab(location.query);

    if (tab === "rendimiento") {
      return Promise.all([
        merchantFilterOptionsQuery(),
        gpvPerformanceViewQuery({ filter }),
      ]);
    }

    if (tab === "cohortes" || tab === "atribucion") {
      return Promise.all([
        merchantFilterOptionsQuery(),
        cohortRowsQuery({
          filter,
          page: { limit: GPV_GRID_PAGE_SIZE, offset: 0 },
        }),
      ]);
    }

    return Promise.all([
      merchantFilterOptionsQuery(),
      gpvCulqiViewQuery({ filter }),
    ]);
  },
} satisfies RouteDefinition;

export default function MerchantGpvRoute() {
  return <MerchantGpvDashboard />;
}
