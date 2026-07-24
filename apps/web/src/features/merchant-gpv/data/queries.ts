import { query } from "@solidjs/router";

import {
  getCohortRows,
  getFilterOptions,
  getGpvCulqi,
  getGpvPerformance,
} from "~/actions/merchant-gpv/dashboard";
import { getExecutiveGpvProgress } from "~/actions/merchant-gpv/executive-progress";
import { getGpvSnapshot } from "~/actions/merchant-gpv/imports";
import { getMerchantStatsForRuc } from "~/actions/merchant-gpv/org-stats";
import { getQualityRows } from "~/actions/merchant-gpv/quality";

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
