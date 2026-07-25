import { query } from "@solidjs/router";

import {
  getCohortRows,
  getFilterOptions,
  getGpvCulqi,
  getGpvPerformance,
} from "~/actions/merchant-stats/dashboard";
import { getExecutiveGpvProgress } from "~/actions/merchant-stats/executive-progress";
import { getGpvSnapshot } from "~/actions/merchant-stats/imports";
import { getMerchantStatsForRuc } from "~/actions/merchant-stats/org-stats";
import { getQualityRows } from "~/actions/merchant-stats/quality";

export const gpvPerformanceViewQuery = query(
  getGpvPerformance,
  "merchantGpvPerformanceView",
);

export const gpvCulqiViewQuery = query(getGpvCulqi, "merchantGpvCulqiView");

export const cohortRowsQuery = query(getCohortRows, "merchantCohortRows");

export const merchantFilterOptionsQuery = query(
  getFilterOptions,
  "merchantFilterOptions",
);

export const qualityRowsQuery = query(getQualityRows, "merchantQualityRows");

export const merchantStatsByRucQuery = query(
  getMerchantStatsForRuc,
  "merchantStatsByRuc",
);

export const gpvSnapshotQuery = query(getGpvSnapshot, "merchantGpvSnapshot");

export const executiveGpvProgressQuery = query(
  getExecutiveGpvProgress,
  "merchantGpvExecutiveProgress",
);
