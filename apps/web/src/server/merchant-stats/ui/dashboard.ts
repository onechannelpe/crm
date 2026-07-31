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
import { getCohortRows as readCohortRows } from "~/server/merchant-stats/read/cohort";
import {
  getGpvCulqiView,
  getGpvPerformanceView,
} from "~/server/merchant-stats/read/dashboard-views";
import { getFilterOptions as readFilterOptions } from "~/server/merchant-stats/read/options";
import { readPublishedGpvPage } from "~/server/merchant-stats/read/published-page";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { db } from "~/server/platform/database/db";
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

    execute: async (_ctx, input) =>
      Ok(await getGpvPerformanceView(db, input.filter, new Date())),
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

    execute: async (_ctx, input) => Ok(await getGpvCulqiView(db, input.filter)),
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

    execute: async (_ctx, input) => {
      const rows = await readPublishedGpvPage(db, (transaction) =>
        readCohortRows(transaction, input.filter, input.page),
      );
      return Ok(rows);
    },
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return executeSessionServerFunction({
    name: "merchantStats.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () => Ok(await readFilterOptions(db)),
  });
}
