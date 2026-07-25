import { type RouteDefinition } from "@solidjs/router";

import {
  cohortRowsQuery,
  gpvCulqiViewQuery,
  gpvPerformanceViewQuery,
  merchantFilterOptionsQuery,
} from "~/features/merchant-stats/data/queries";
import { readGpvFilter, readGpvTab } from "~/features/merchant-stats/gpv-view";
import { GPV_GRID_PAGE_SIZE } from "~/features/merchant-stats/grids/use-dashboard-grid";
import { MerchantGpvDashboard } from "~/features/merchant-stats/merchant-gpv-dashboard";

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
