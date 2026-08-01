import "server-only";
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
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
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
  return executeSessionServerFunction({
    name: "merchantStats.performance.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (ctx, input) =>
      Ok(
        await application.merchantStats.dashboard.performance(
          input.filter,
          ctx.operationAt,
        ),
      ),
  });
}

export async function getGpvCulqi(raw: {
  filter: BookFilter;
}): Promise<GpvCulqiView> {
  return executeSessionServerFunction({
    name: "merchantStats.culqi.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (_ctx, input) =>
      Ok(await application.merchantStats.dashboard.culqi(input.filter)),
  });
}

export async function getCohortRows(raw: {
  filter: BookFilter;
  page: Page;
}): Promise<PublishedPage<CohortSaleRow>> {
  return executeSessionServerFunction({
    name: "merchantStats.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        page: r.obj("page", readPage),
      })),

    execute: async (_ctx, input) =>
      Ok(
        await application.merchantStats.dashboard.cohorts(
          input.filter,
          input.page,
        ),
      ),
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return executeSessionServerFunction({
    name: "merchantStats.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await application.merchantStats.dashboard.filterOptions()),
  });
}
