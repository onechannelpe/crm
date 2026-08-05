import type { CohortSaleRow } from "~/contracts/merchant-stats/views";
import { cohortRowsQuery } from "~/rpc/merchant-stats/cohort-rows";

import type { GpvView } from "../gpv-view";
import { GPV_GRID_PAGE_SIZE, useDashboardGrid } from "./use-dashboard-grid";

export function useCohortRowsGrid(view: GpvView) {
  return useDashboardGrid<CohortSaleRow>({
    pageSize: GPV_GRID_PAGE_SIZE,
    resetKey: () => JSON.stringify(view.filter()),
    load: (page) => cohortRowsQuery({ filter: view.filter(), page }),
  });
}
