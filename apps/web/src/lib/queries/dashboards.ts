import { query } from "@solidjs/router";

import {
  getAccountRows,
  getCohortRows,
  getMerchantStatsOverview,
} from "~/actions/dashboards/dashboard";
import { getMerchantReportJob } from "~/actions/dashboards/imports";
import { getMerchantStatsForRuc } from "~/actions/dashboards/org-stats";
import type { MerchantStatsFilters } from "~/server/merchant-stats/read/contracts";

export const merchantStatsOverviewQuery = query(
  (filters: MerchantStatsFilters) => getMerchantStatsOverview(filters),
  "merchantStatsOverview",
);

export const cohortRowsQuery = query(
  (input: {
    filters: MerchantStatsFilters;
    page: { limit: number; offset: number };
  }) => getCohortRows(input.filters, input.page),
  "merchantStatsCohort",
);

export const accountRowsQuery = query(
  (input: {
    filters: MerchantStatsFilters & { missingEnrichment?: boolean };
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
