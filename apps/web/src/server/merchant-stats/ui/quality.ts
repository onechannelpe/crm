import type {
  Page,
  PublishedPage,
  QualityRow,
} from "~/contracts/merchant-stats/views";
import {
  QUALITY_ISSUES,
  type QualityIssue,
} from "~/contracts/merchant-stats/vocabulary";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

const DEFAULT_PAGE = 60;
const MAX_PAGE = 200;

export async function getQualityRows(raw: {
  issue: QualityIssue;
  page: Page;
}): Promise<PublishedPage<QualityRow>> {
  return executeSessionServerFunction({
    name: "merchantStats.quality.rows",
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

    telemetry: (input) => ({ issue: input.issue }),

    execute: async (_ctx, input) =>
      Ok(
        await getApplication().merchantStats.quality.rows(
          input.issue,
          input.page,
        ),
      ),
  });
}
