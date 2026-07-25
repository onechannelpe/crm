"use server";

import type {
  Page,
  PublishedPage,
  QualityRow,
} from "~/contracts/merchant-stats/views";
import {
  QUALITY_ISSUES,
  type QualityIssue,
} from "~/contracts/merchant-stats/vocabulary";
import { readPublishedGpvPage } from "~/server/merchant-stats/read/published-page";
import { getQualityRows as readQualityRows } from "~/server/merchant-stats/read/quality";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/shared/result";

const DEFAULT_PAGE = 60;
const MAX_PAGE = 200;

export async function getQualityRows(raw: {
  issue: QualityIssue;
  page: Page;
}): Promise<PublishedPage<QualityRow>> {
  return runAction({
    name: "merchantGpv.quality.rows",
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

    execute: async (_ctx, input) => {
      const db = getServerRuntime().infra.db;
      const page = await readPublishedGpvPage(db, (transaction) =>
        readQualityRows(transaction, input.issue, input.page),
      );

      return Ok(page);
    },
  });
}
