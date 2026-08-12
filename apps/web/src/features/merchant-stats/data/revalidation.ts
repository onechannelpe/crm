import { cohortRowsQuery } from "~/rpc/merchant-stats/cohort-rows";
import { executiveGpvProgressQuery } from "~/rpc/merchant-stats/executive-gpv-progress";
import { gpvCulqiViewQuery } from "~/rpc/merchant-stats/gpv-culqi-view";
import { gpvPerformanceViewQuery } from "~/rpc/merchant-stats/gpv-performance-view";
import { merchantFilterOptionsQuery } from "~/rpc/merchant-stats/merchant-filter-options";
import { merchantStatsByRucQuery } from "~/rpc/merchant-stats/merchant-stats-by-ruc";
import { qualityRowsQuery } from "~/rpc/merchant-stats/quality-rows";

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
