import {
  cohortRowsQuery,
  executiveGpvProgressQuery,
  gpvCulqiViewQuery,
  gpvPerformanceViewQuery,
  merchantFilterOptionsQuery,
  merchantStatsByRucQuery,
  qualityRowsQuery,
} from "./queries";

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
