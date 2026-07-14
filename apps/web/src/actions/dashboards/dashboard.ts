"use server";

import type {
  MerchantStatsFilterOptions,
  MerchantStatsFilters,
  CohortGridRow,
  DataQualitySummary,
  MerchantAccountRow,
  MonthlyGpvPoint,
  SellerPerformanceRow,
} from "~/server/merchant-stats/read/contracts";
import {
  getCohortGrid,
  getDataQuality,
  getFilterOptions,
  getMerchantAccounts,
  getMonthlyGpv,
  getSellerPerformance,
} from "~/server/merchant-stats/read/queries";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/server/shared/result";

type RawFilters = Partial<MerchantStatsFilters> | undefined;

function cleanFilters(raw: RawFilters): MerchantStatsFilters {
  if (!raw) return {};
  const pick = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;
  return {
    month: pick(raw.month),
    branchId: pick(raw.branchId),
    sellerUserId: pick(raw.sellerUserId),
    product: pick(raw.product),
  };
}

export interface MerchantStatsOverview {
  monthly: MonthlyGpvPoint[];
  sellers: SellerPerformanceRow[];
  dataQuality: DataQualitySummary;
  options: MerchantStatsFilterOptions;
}

export async function getMerchantStatsOverview(
  raw: RawFilters,
): Promise<MerchantStatsOverview> {
  return runAction({
    name: "dashboards.overview.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(cleanFilters(raw)),

    execute: async (_ctx, filters) => {
      const db = getServerRuntime().infra.db;
      const [monthly, sellers, dataQuality, options] = await Promise.all([
        getMonthlyGpv(db, filters),
        getSellerPerformance(db, filters),
        getDataQuality(db),
        getFilterOptions(db),
      ]);
      return Ok({ monthly, sellers, dataQuality, options });
    },
  });
}

export async function getCohortRows(
  raw: RawFilters,
  page: { limit: number; offset: number },
): Promise<CohortGridRow[]> {
  return runAction({
    name: "dashboards.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok({ filters: cleanFilters(raw), page }),

    execute: async (_ctx, input) => {
      const db = getServerRuntime().infra.db;
      return Ok(await getCohortGrid(db, input.filters, input.page));
    },
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
          ...cleanFilters(raw),
          missingEnrichment: raw?.missingEnrichment === true,
        },
        page,
      }),

    execute: async (_ctx, input) => {
      const db = getServerRuntime().infra.db;
      return Ok(await getMerchantAccounts(db, input.filters, input.page));
    },
  });
}
