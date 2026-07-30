"use server";

import type {
  BookFilter,
  CohortSaleRow,
  FilterOptions,
  GpvCulqiView,
  GpvPerformanceView,
  Page,
  PublishedPage,
} from "~/contracts/merchant-stats/views";
import type { DomainError } from "~/domain/errors";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { Ok } from "~/shared/result";

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 200;

function readFilter(r: Reader<DomainError>): BookFilter {
  return {
    branchId: r.optStr("branchId") ?? undefined,
    sellerUserId: r.optStr("sellerUserId") ?? undefined,
    month: r.optCalendarMonth("month") ?? undefined,
    product: r.optStr("product") ?? undefined,
  };
}

function readPage(r: Reader<DomainError>): Page {
  return {
    limit:
      r.optIntRange("limit", {
        min: 1,
        max: MAX_PAGE_SIZE,
      }) ?? DEFAULT_PAGE_SIZE,
    offset:
      r.optIntRange("offset", {
        min: 0,
        max: 1_000_000,
      }) ?? 0,
  };
}

export async function getGpvPerformance(raw: {
  filter: BookFilter;
}): Promise<GpvPerformanceView> {
  return runAction({
    name: "merchantStats.performance.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (_ctx, input) =>
      Ok(await getMerchantStatsRuntime().dashboard.performance(input.filter)),
  });
}

export async function getGpvCulqi(raw: {
  filter: BookFilter;
}): Promise<GpvCulqiView> {
  return runAction({
    name: "merchantStats.culqi.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (_ctx, input) =>
      Ok(await getMerchantStatsRuntime().dashboard.culqi(input.filter)),
  });
}

export async function getCohortRows(raw: {
  filter: BookFilter;
  page: Page;
}): Promise<PublishedPage<CohortSaleRow>> {
  return runAction({
    name: "merchantStats.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        page: r.obj("page", readPage),
      })),

    execute: async (_ctx, input) =>
      Ok(
        await getMerchantStatsRuntime().dashboard.cohorts(
          input.filter,
          input.page,
        ),
      ),
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return runAction({
    name: "merchantStats.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await getMerchantStatsRuntime().dashboard.filterOptions()),
  });
}

export async function requestMerchantGpvExportDownloadToken(raw: BookFilter) {
  return runAction({
    name: "merchantStats.export",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ filter: raw }, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    audit: ({ filter }) => ({
      branchId: filter.branchId ?? null,
      sellerUserId: filter.sellerUserId ?? null,
      month: filter.month ?? null,
      product: filter.product ?? null,
    }),

    execute: (ctx, input) =>
      getMerchantStatsRuntime().dashboard.export(ctx, input.filter),
  });
}
