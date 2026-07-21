import { query } from "@solidjs/router";

import {
  getAttainment,
  getCohortRows,
  getCulqiUserGpv,
  getFilterOptions,
  getLifecycleSummary,
  getRamp,
} from "~/actions/dashboards/dashboard";
import { getMerchantStatsForRuc } from "~/actions/dashboards/org-stats";
import {
  getQualityRows,
  getQualitySummary,
} from "~/actions/dashboards/quality";
import type { BookFilter, Page } from "~/contracts/merchant-stats/views";
import type { QualityIssue } from "~/contracts/merchant-stats/vocabulary";

export const attainmentQuery = query(
  (input: { filter: BookFilter; month: string }) => getAttainment(input),
  "merchantAttainment",
);

export const culqiUserGpvQuery = query(
  (input: { filter: BookFilter; month: string }) => getCulqiUserGpv(input),
  "merchantCulqiUserGpv",
);

export const rampQuery = query(
  (input: { filter: BookFilter }) => getRamp(input),
  "merchantRamp",
);

export const lifecycleQuery = query(
  (input: { filter: BookFilter }) => getLifecycleSummary(input),
  "merchantLifecycle",
);

export const cohortRowsQuery = query(
  (input: { filter: BookFilter; page: Page }) => getCohortRows(input),
  "merchantCohortRows",
);

export const merchantFilterOptionsQuery = query(
  () => getFilterOptions(),
  "merchantFilterOptions",
);

export const qualitySummaryQuery = query(
  () => getQualitySummary(),
  "merchantQualitySummary",
);

export const qualityRowsQuery = query(
  (input: { issue: QualityIssue; page: Page }) => getQualityRows(input),
  "merchantQualityRows",
);

export const merchantStatsByRucQuery = query(
  (ruc: string) => getMerchantStatsForRuc(ruc),
  "merchantStatsByRuc",
);
