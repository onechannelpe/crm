import { query } from "@solidjs/router";

import { getAccountRows, getCohortRows } from "~/actions/dashboards/dashboard";
import { getBusinessStatsOverview } from "~/actions/dashboards/dashboard";
import { getMerchantReportJob } from "~/actions/dashboards/imports";
import { getMerchantStatsForRuc } from "~/actions/dashboards/org-stats";
import type { BusinessStatsFilters } from "~/server/merchant-stats/read/contracts";

export const businessStatsOverviewQuery = query(
  (filters: BusinessStatsFilters) => getBusinessStatsOverview(filters),
  "businessStatsOverview",
);

export const cohortRowsQuery = query(
  (input: {
    filters: BusinessStatsFilters;
    page: { limit: number; offset: number };
  }) => getCohortRows(input.filters, input.page),
  "businessStatsCohort",
);

export const accountRowsQuery = query(
  (input: {
    filters: BusinessStatsFilters & { missingEnrichment?: boolean };
    page: { limit: number; offset: number };
  }) => getAccountRows(input.filters, input.page),
  "businessStatsAccounts",
);

export const merchantReportJobQuery = query(
  (jobId: string) => getMerchantReportJob(jobId),
  "merchantReportJob",
);

export const merchantStatsByRucQuery = query(
  (ruc: string) => getMerchantStatsForRuc(ruc),
  "merchantStatsByRuc",
);
