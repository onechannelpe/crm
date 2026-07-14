import { query } from "@solidjs/router";

import {
  getAccountRows,
  getCohortRows,
  getMerchantFilterOptions,
  getMerchantPerformance,
} from "~/actions/dashboards/dashboard";
import { getMerchantReportJob } from "~/actions/dashboards/imports";
import { getMerchantStatsForRuc } from "~/actions/dashboards/org-stats";
import type { RecordFilters } from "~/server/merchant-stats/read/contracts";

export const merchantPerformanceQuery = query(
  (offset: number) => getMerchantPerformance(offset),
  "merchantPerformance",
);

// Options change only on import, never on filter input, so they are their own
// query rather than a field refetched with every filtered read.
export const merchantFilterOptionsQuery = query(
  () => getMerchantFilterOptions(),
  "merchantFilterOptions",
);

export const cohortRowsQuery = query(
  (input: {
    filters: RecordFilters;
    page: { limit: number; offset: number };
  }) => getCohortRows(input.filters, input.page),
  "merchantStatsCohort",
);

export const accountRowsQuery = query(
  (input: {
    filters: RecordFilters & { missingEnrichment?: boolean };
    page: { limit: number; offset: number };
  }) => getAccountRows(input.filters, input.page),
  "merchantStatsAccounts",
);

export const merchantReportJobQuery = query(
  (jobId: string) => getMerchantReportJob(jobId),
  "merchantReportJob",
);

export const merchantStatsByRucQuery = query(
  (ruc: string) => getMerchantStatsForRuc(ruc),
  "merchantStatsByRuc",
);
