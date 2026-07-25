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
import { requestMerchantGpvExport } from "~/server/merchant-stats/export/request-export";
import { getCohortRows as readCohortRows } from "~/server/merchant-stats/read/cohort";
import {
  getGpvCulqiView as readGpvCulqiView,
  getGpvPerformanceView as readGpvPerformanceView,
} from "~/server/merchant-stats/read/dashboard-views";
import { getFilterOptions as readFilterOptions } from "~/server/merchant-stats/read/options";
import { readPublishedGpvPage } from "~/server/merchant-stats/read/published-page";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";
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
    name: "merchantGpv.performance.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (ctx, input) =>
      Ok(
        await readGpvPerformanceView(
          getServerRuntime().infra.db,
          input.filter,
          ctx.now(),
        ),
      ),
  });
}

export async function getGpvCulqi(raw: {
  filter: BookFilter;
}): Promise<GpvCulqiView> {
  return runAction({
    name: "merchantGpv.culqi.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (_ctx, input) =>
      Ok(await readGpvCulqiView(getServerRuntime().infra.db, input.filter)),
  });
}

export async function getCohortRows(raw: {
  filter: BookFilter;
  page: Page;
}): Promise<PublishedPage<CohortSaleRow>> {
  return runAction({
    name: "merchantGpv.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        page: r.obj("page", readPage),
      })),

    execute: async (_ctx, input) => {
      const db = getServerRuntime().infra.db;
      const page = await readPublishedGpvPage(db, (transaction) =>
        readCohortRows(transaction, input.filter, input.page),
      );

      return Ok(page);
    },
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return runAction({
    name: "merchantGpv.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await readFilterOptions(getServerRuntime().infra.db)),
  });
}

export async function requestMerchantGpvExportDownloadToken(raw: BookFilter) {
  return runAction({
    name: "merchantGpv.export",
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

    execute: (ctx, input) => {
      const runtime = getServerRuntime();
      return requestMerchantGpvExport(ctx, input.filter, {
        db: runtime.infra.db,
        filesRepo: runtime.files.repo,
        filesStorage: runtime.files.storage,
      });
    },
  });
}
