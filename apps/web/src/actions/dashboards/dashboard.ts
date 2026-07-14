"use server";

import { getMerchantAccounts } from "~/server/merchant-stats/read/attribution";
import { getCohortReport } from "~/server/merchant-stats/read/cohort-report";
import type {
  AttainmentRow,
  CohortFilters,
  CohortRampSeries,
  CohortSaleRow,
  DataQualitySummary,
  LifecycleSummary,
  MerchantAccountRow,
  MerchantStatsFilterOptions,
  RecordFilters,
} from "~/server/merchant-stats/read/contracts";
import { getDataQuality } from "~/server/merchant-stats/read/data-quality";
import { getFilterOptions } from "~/server/merchant-stats/read/filter-options";
import {
  getBranchAttainment,
  getCohortRamp,
  getLifecycle,
  getSellerAttainment,
} from "~/server/merchant-stats/read/performance";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/server/shared/result";

type RawFilters = Partial<RecordFilters> | undefined;

const pick = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

// Branch and seller are the only real slices of the book.
// Month is the cohort axis.
function cleanCohortFilters(raw: RawFilters): CohortFilters {
  if (!raw) return {};
  return { branchId: pick(raw.branchId), sellerKey: pick(raw.sellerKey) };
}

function cleanRecordFilters(raw: RawFilters): RecordFilters {
  if (!raw) return {};
  return {
    ...cleanCohortFilters(raw),
    saleMonth: pick(raw.saleMonth),
    product: pick(raw.product),
  };
}

export interface MerchantPerformance {
  ramp: CohortRampSeries[];
  sellers: AttainmentRow[];
  branches: AttainmentRow[];
  lifecycle: LifecycleSummary;
  dataQuality: DataQualitySummary;
}

// The performance surface is read whole and grouped: the whole book is ranked
// at once. Cohort step is a parameter because a target is per month, so
// comparing GPV to it only means anything at one step at a time.
export async function getMerchantPerformance(
  offset: number,
): Promise<MerchantPerformance> {
  return runAction({
    name: "dashboards.performance.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok({ offset: Number.isInteger(offset) ? offset : 0 }),

    execute: async (_ctx, input) => {
      const db = getServerRuntime().infra.db;
      const [ramp, sellers, branches, lifecycle, dataQuality] =
        await Promise.all([
          getCohortRamp(db, {}),
          getSellerAttainment(db, {}, input.offset),
          getBranchAttainment(db, {}, input.offset),
          getLifecycle(db, {}),
          getDataQuality(db),
        ]);
      return Ok({ ramp, sellers, branches, lifecycle, dataQuality });
    },
  });
}

export async function getMerchantFilterOptions(): Promise<MerchantStatsFilterOptions> {
  return runAction({
    name: "dashboards.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await getFilterOptions(getServerRuntime().infra.db)),
  });
}

export async function getCohortRows(
  raw: RawFilters,
  page: { limit: number; offset: number },
): Promise<CohortSaleRow[]> {
  return runAction({
    name: "dashboards.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok({ filters: cleanRecordFilters(raw), page }),

    execute: async (_ctx, input) =>
      Ok(
        await getCohortReport(
          getServerRuntime().infra.db,
          input.filters,
          input.page,
        ),
      ),
  });
}

export async function getAccountRows(
  raw: (RawFilters & { missingEnrichment?: boolean }) | undefined,
  page: { limit: number; offset: number },
): Promise<MerchantAccountRow[]> {
  return runAction({
    name: "dashboards.accounts.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () =>
      Ok({
        filters: {
          ...cleanRecordFilters(raw),
          missingEnrichment: raw?.missingEnrichment === true,
        },
        page,
      }),

    execute: async (_ctx, input) =>
      Ok(
        await getMerchantAccounts(
          getServerRuntime().infra.db,
          input.filters,
          input.page,
        ),
      ),
  });
}
