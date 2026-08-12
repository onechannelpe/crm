import { query } from "@solidjs/router";

import { application } from "~/server/composition/application";
import { buildCommissionSchemeRules } from "~/server/merchant-stats/commission/rules-codec";
import {
  getCommissionManagerDashboard,
  getCommissionSchemeDraft,
} from "~/server/merchant-stats/ui/commission";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { isErr, Ok } from "~/shared/result";

export const commissionManagerDashboardQuery = query(async () => {
  "use server";
  return getCommissionManagerDashboard();
}, "merchant-stats.commission.manager-view");

export const commissionSchemeDraftQuery = query(async () => {
  "use server";
  return getCommissionSchemeDraft();
}, "merchant-stats.commission.scheme-draft");

export async function setCommissionScheme(raw: {
  effectiveFrom: string;
  rules: unknown;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.commission.scheme.set",
    access: { kind: "permission", permission: "commission:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        effectiveFrom: r.calendarDate("effectiveFrom"),
        rules: r.obj("rules", buildCommissionSchemeRules),
      })),

    execute: async (ctx, input) => {
      const result = await application.merchantStats.commission.setScheme(
        {
          effectiveFrom: input.effectiveFrom,
          rules: input.rules,
          setBy: ctx.actor.userId,
        },
        ctx,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ ok: true as const });
    },
  });
}
