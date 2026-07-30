"use server";

import { UserId } from "~/domain/ids";
import type { CalendarMonth } from "~/domain/time/calendar-date";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { isErr, Ok } from "~/shared/result";

export async function adjustMonthCredit(raw: {
  ruc: string;
  month: CalendarMonth;
  sellerUserId: string | null;
  reason: string;
}) {
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

    audit: ({ ruc, month }) => ({ ruc, month }),

    execute: async ({ actor }, input) => {
      const resolved = await getMerchantStatsRuntime().attribution.adjust({
        ruc: input.ruc,
        month: input.month,
        sellerUserId: input.sellerUserId,
        reason: input.reason,
        adjustedBy: actor.userId,
      });

      if (isErr(resolved)) return resolved;

      return Ok({ ok: true as const });
    },
  });
}

export async function setMerchantTarget(raw: {
  ruc: string;
  effectiveFrom: CalendarMonth;
  projectedGpv: number | null;
}) {
  return executeSessionServerFunction({
    name: "merchantStats.target.set",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        effectiveFrom: r.calendarMonth("effectiveFrom"),
        projectedGpv: r.optNum("projectedGpv"),
      })),

    audit: ({ ruc, effectiveFrom }) => ({ ruc, effectiveFrom }),

    execute: async ({ actor }, input) => {
      const updated = await getMerchantStatsRuntime().attribution.setTarget({
        ruc: input.ruc,
        effectiveFrom: input.effectiveFrom,
        projectedGpv: input.projectedGpv,
        setBy: actor.userId,
      });

      if (isErr(updated)) return updated;

      return Ok({ ok: true as const });
    },
  });
}
