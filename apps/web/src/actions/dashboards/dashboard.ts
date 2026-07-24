"use server";

import type {
  Attainment,
  BookFilter,
  CohortRampSeries,
  CohortSaleRow,
  CulqiUserGpvRow,
  FilterOptions,
  LifecycleSummary,
  Page,
} from "~/contracts/merchant-stats/views";
import { requestMerchantGpvExport } from "~/server/merchant-stats/export/request-export";
import { getAttainment as readAttainment } from "~/server/merchant-stats/read/attainment";
import {
  getCohortRamp,
  getCohortRows as readCohortRows,
} from "~/server/merchant-stats/read/cohort";
import { getCulqiUserGpv as readCulqiUserGpv } from "~/server/merchant-stats/read/culqi-users";
import { getLifecycle } from "~/server/merchant-stats/read/lifecycle";
import { getFilterOptions as readFilterOptions } from "~/server/merchant-stats/read/options";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

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

export async function getAttainment(raw: unknown): Promise<Attainment> {
  return runAction({
    name: "dashboards.attainment.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        month: r.calendarMonth("month"),
      })),

    execute: async (_ctx, input) =>
      Ok(
        await readAttainment(
          getServerRuntime().infra.db,
          input.filter,
          input.month,
        ),
      ),
  });
}

export async function getCulqiUserGpv(
  raw: unknown,
): Promise<CulqiUserGpvRow[]> {
  return runAction({
    name: "dashboards.culqiUsers.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        month: r.calendarMonth("month"),
      })),

    execute: async (_ctx, input) =>
      Ok(
        await readCulqiUserGpv(
          getServerRuntime().infra.db,
          input.filter,
          input.month,
        ),
      ),
  });
}

export async function getRamp(raw: unknown): Promise<CohortRampSeries[]> {
  return runAction({
    name: "dashboards.ramp.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (_ctx, input) =>
      Ok(await getCohortRamp(getServerRuntime().infra.db, input.filter)),
  });
}

export async function getLifecycleSummary(
  raw: unknown,
): Promise<LifecycleSummary> {
  return runAction({
    name: "dashboards.lifecycle.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
      })),

    execute: async (ctx, input) =>
      Ok(
        await getLifecycle(
          getServerRuntime().infra.db,
          input.filter,
          ctx.now(),
        ),
      ),
  });
}

export async function getCohortRows(raw: unknown): Promise<CohortSaleRow[]> {
  return runAction({
    name: "dashboards.cohort.read",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        filter: r.obj("filter", readFilter),
        page: r.obj("page", readPage),
      })),

    execute: async (_ctx, input) =>
      Ok(
        await readCohortRows(
          getServerRuntime().infra.db,
          input.filter,
          input.page,
        ),
      ),
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return runAction({
    name: "dashboards.filterOptions.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await readFilterOptions(getServerRuntime().infra.db)),
  });
}

export async function requestMerchantGpvExportDownloadToken(
  raw: unknown,
): Promise<{ token: string }> {
  return runAction({
    name: "dashboards.merchantGpv.export",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
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
