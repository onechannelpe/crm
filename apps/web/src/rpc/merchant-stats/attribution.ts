import { UserId } from "~/domain/ids";
import type { CalendarMonth } from "~/domain/time/calendar-date";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { isErr, Ok } from "~/shared/result";

export async function adjustMonthCredit(raw: {
  ruc: string;
  month: CalendarMonth;
  sellerUserId: string | null;
  reason?: string;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.attribution.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        month: r.calendarMonth("month"),
        sellerUserId: r.optId("sellerUserId", UserId) ?? null,
        reason: r.optStr("reason") ?? "Corrección manual",
      })),

    telemetry: ({ ruc, month }) => ({ ruc, month }),

    execute: async (ctx, input) => {
      const result = await getApplication().merchantStats.attribution.adjust(
        {
          ruc: input.ruc,
          month: input.month,
          sellerUserId: input.sellerUserId,
          reason: input.reason,
          adjustedBy: ctx.actor.userId,
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

export async function setMerchantTarget(raw: {
  ruc: string;
  effectiveFrom: CalendarMonth;
  projectedGpv: number | null;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.target.set",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        effectiveFrom: r.calendarMonth("effectiveFrom"),
        projectedGpv: r.optNum("projectedGpv"),
      })),

    telemetry: ({ ruc, effectiveFrom }) => ({ ruc, effectiveFrom }),

    execute: async (ctx, input) => {
      const result = await getApplication().merchantStats.attribution.setTarget(
        {
          ruc: input.ruc,
          effectiveFrom: input.effectiveFrom,
          projectedGpv: input.projectedGpv,
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
