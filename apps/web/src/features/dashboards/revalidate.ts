import { revalidate } from "@solidjs/router";

import {
  attainmentQuery,
  cohortRowsQuery,
  culqiUserGpvQuery,
  lifecycleQuery,
  merchantFilterOptionsQuery,
  qualityRowsQuery,
  qualitySummaryQuery,
  rampQuery,
} from "~/lib/queries/dashboards";
import { homeMerchantPortfolioQuery } from "~/lib/queries/home";

const GPV_QUERY_KEYS = [
  attainmentQuery.key,
  rampQuery.key,
  lifecycleQuery.key,
  cohortRowsQuery.key,
  culqiUserGpvQuery.key,
  merchantFilterOptionsQuery.key,
  qualitySummaryQuery.key,
  qualityRowsQuery.key,
  homeMerchantPortfolioQuery.key,
];

export function revalidateGpvData(): Promise<void> {
  return revalidate(GPV_QUERY_KEYS);
}
