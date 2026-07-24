import { revalidate } from "@solidjs/router";

import { QUERY_KEYS } from "~/contracts/query-keys";

import {
  cohortRowsQuery,
  gpvCulqiViewQuery,
  gpvPerformanceViewQuery,
  merchantFilterOptionsQuery,
  merchantStatsByRucQuery,
  qualityRowsQuery,
} from "./data/queries";

const PUBLISHED_GPV_QUERY_KEYS = [
  gpvPerformanceViewQuery.key,
  gpvCulqiViewQuery.key,
  cohortRowsQuery.key,
  merchantFilterOptionsQuery.key,
  merchantStatsByRucQuery.key,
  qualityRowsQuery.key,
  QUERY_KEYS.homeMerchantPortfolio,
];

export function refreshPublishedGpvData(): Promise<void> {
  return revalidate(PUBLISHED_GPV_QUERY_KEYS);
}
