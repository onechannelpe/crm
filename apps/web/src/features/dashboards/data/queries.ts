import { query } from "@solidjs/router";

import {
  getCohortRows,
  getFilterOptions,
  getGpvCulqi,
  getGpvPerformance,
} from "~/actions/merchant-gpv/dashboard";
import { getGpvSnapshot } from "~/actions/merchant-gpv/imports";
import { getMerchantStatsForRuc } from "~/actions/merchant-gpv/org-stats";
import { getQualityRows } from "~/actions/merchant-gpv/quality";
import { QUERY_KEYS } from "~/contracts/query-keys";

export const gpvPerformanceViewQuery = query(
  getGpvPerformance,
  QUERY_KEYS.merchantGpv.performanceView,
);

export const gpvCulqiViewQuery = query(
  getGpvCulqi,
  QUERY_KEYS.merchantGpv.culqiView,
);

export const cohortRowsQuery = query(
  getCohortRows,
  QUERY_KEYS.merchantGpv.cohortRows,
);

export const merchantFilterOptionsQuery = query(
  getFilterOptions,
  QUERY_KEYS.merchantGpv.filterOptions,
);

export const qualityRowsQuery = query(
  getQualityRows,
  QUERY_KEYS.merchantGpv.qualityRows,
);

export const merchantStatsByRucQuery = query(
  getMerchantStatsForRuc,
  QUERY_KEYS.merchantGpv.statsByRuc,
);

export const gpvSnapshotQuery = query(
  getGpvSnapshot,
  QUERY_KEYS.merchantGpv.snapshot,
);
