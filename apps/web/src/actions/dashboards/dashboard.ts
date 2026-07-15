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
import { Ok, type Result } from "~/server/shared/result";

const DEFAULT_PAGE = 60;
const MAX_PAGE = 200;

// Filters arrive from our own option list, but they arrive over the wire, so
// they are read as unknown and narrowed here rather than trusted as a shape.
function readFilter(r: Reader<DomainError>): BookFilter {
  return {
    branchId: r.optStr("branchId") ?? undefined,
    sellerUserId: r.optStr("sellerUserId") ?? undefined,
    month: r.optStr("month") ?? undefined,
    product: r.optStr("product") ?? undefined,
  };
}

// The client picks the page size, so it is bounded here rather than passed
// straight into .limit(): an unbounded limit is a database-sized foot-gun on a
// public boundary.
function readPage(r: Reader<DomainError>): Page {
  return {
    limit: r.optIntRange("limit", { min: 1, max: MAX_PAGE }) ?? DEFAULT_PAGE,
    offset: r.optIntRange("offset", { min: 0, max: 1_000_000 }) ?? 0,
  };
}

function parseFilterAndMonth(
  raw: unknown,
): Result<{ filter: BookFilter; month: string }, DomainError> {
  return parseObject(raw, validationFail, (r) => ({
    filter: r.obj("filter", readFilter),
    month: r.str("month"),
  }));
}

function parseFilter(
  raw: unknown,
): Result<{ filter: BookFilter }, DomainError> {
  return parseObject(raw, validationFail, (r) => ({
    filter: r.obj("filter", readFilter),
  }));
}

export async function getAttainment(raw: unknown): Promise<Attainment> {
  return runAction({
    name: "dashboards.attainment.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => parseFilterAndMonth(raw),

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

// Culqi's own view of who sold what. A reconciliation surface, not a board.
export async function getCulqiUserGpv(
  raw: unknown,
): Promise<CulqiUserGpvRow[]> {
  return runAction({
    name: "dashboards.culqiUsers.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => parseFilterAndMonth(raw),

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
    parse: () => parseFilter(raw),

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
    parse: () => parseFilter(raw),

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
