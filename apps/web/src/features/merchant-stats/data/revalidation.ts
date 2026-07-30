import { cohortRowsQuery } from "~/features/merchant-stats/data/cohort-rows.query";
import { executiveGpvProgressQuery } from "~/features/merchant-stats/data/executive-gpv-progress.query";
import { gpvCulqiViewQuery } from "~/features/merchant-stats/data/gpv-culqi-view.query";
import { gpvPerformanceViewQuery } from "~/features/merchant-stats/data/gpv-performance-view.query";
import { merchantFilterOptionsQuery } from "~/features/merchant-stats/data/merchant-filter-options.query";
import { merchantStatsByRucQuery } from "~/features/merchant-stats/data/merchant-stats-by-ruc.query";
import { qualityRowsQuery } from "~/features/merchant-stats/data/quality-rows.query";

export const ATTRIBUTION_GPV_QUERY_KEYS = [
  cohortRowsQuery.key,
  gpvPerformanceViewQuery.key,
  executiveGpvProgressQuery.key,
  merchantStatsByRucQuery.key,
  qualityRowsQuery.key,
];

export const PUBLISHED_GPV_QUERY_KEYS = [
  ...ATTRIBUTION_GPV_QUERY_KEYS,
  gpvCulqiViewQuery.key,
  merchantFilterOptionsQuery.key,
];
