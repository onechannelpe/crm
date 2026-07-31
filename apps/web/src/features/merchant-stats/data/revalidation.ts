import { cohortRowsQuery } from "~/rpc/merchant-stats/cohort-rows.query";
import { executiveGpvProgressQuery } from "~/rpc/merchant-stats/executive-gpv-progress.query";
import { gpvCulqiViewQuery } from "~/rpc/merchant-stats/gpv-culqi-view.query";
import { gpvPerformanceViewQuery } from "~/rpc/merchant-stats/gpv-performance-view.query";
import { merchantFilterOptionsQuery } from "~/rpc/merchant-stats/merchant-filter-options.query";
import { merchantStatsByRucQuery } from "~/rpc/merchant-stats/merchant-stats-by-ruc.query";
import { qualityRowsQuery } from "~/rpc/merchant-stats/quality-rows.query";

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
