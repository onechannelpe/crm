"use server";

import type {
  QualityRow,
  QualitySummary,
} from "~/contracts/merchant-stats/views";
import { QUALITY_ISSUES } from "~/contracts/merchant-stats/vocabulary";
import {
  getQualityRows as readQualityRows,
  getQualitySummary as readQualitySummary,
} from "~/server/merchant-stats/read/quality";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

const DEFAULT_PAGE = 60;
const MAX_PAGE = 200;

export async function getQualitySummary(): Promise<QualitySummary> {
  return runAction({
    name: "dashboards.quality.summary",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => Ok(undefined),

    execute: async () =>
      Ok(await readQualitySummary(getServerRuntime().infra.db)),
  });
}

export async function getQualityRows(raw: unknown): Promise<QualityRow[]> {
  return runAction({
    name: "dashboards.quality.rows",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        issue: r.enum("issue", QUALITY_ISSUES),
        page: r.obj("page", (p) => ({
          limit:
            p.optIntRange("limit", { min: 1, max: MAX_PAGE }) ?? DEFAULT_PAGE,
          offset: p.optIntRange("offset", { min: 0, max: 1_000_000 }) ?? 0,
        })),
      })),

    audit: (input) => ({ issue: input.issue }),

    execute: async (_ctx, input) =>
      Ok(
        await readQualityRows(
          getServerRuntime().infra.db,
          input.issue,
          input.page,
        ),
      ),
  });
}
