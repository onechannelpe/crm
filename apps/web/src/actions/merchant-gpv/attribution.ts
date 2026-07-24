"use server";

import { json } from "@solidjs/router";

import { QUERY_KEYS } from "~/contracts/query-keys";
import type { CalendarMonth } from "~/lib/time/calendar-date";
import { setTarget } from "~/server/merchant-stats/commands/set-target";
import { adjustMerchantMonthCredit } from "~/server/merchant-stats/credit/adjust";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";

const ATTRIBUTION_QUERY_KEYS = [
  QUERY_KEYS.merchantGpv.cohortRows,
  QUERY_KEYS.merchantGpv.performanceView,
  QUERY_KEYS.homeMerchantPortfolio,
  QUERY_KEYS.merchantGpv.statsByRuc,
  QUERY_KEYS.merchantGpv.qualityRows,
];

export async function adjustMonthCredit(raw: {
  ruc: string;
  month: CalendarMonth;
  sellerUserId: string | null;
  reason: string;
}) {
  const result = await runAction({
    name: "merchantGpv.attribution.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        month: r.calendarMonth("month"),
        sellerUserId: r.optId("sellerUserId", UserId) ?? null,
        reason: r.optStr("reason") ?? "Corrección manual",
      })),

    audit: ({ ruc, month }) => ({ ruc, month }),

    execute: async ({ actor, now }, input) => {
      const db = getServerRuntime().infra.db;
      const occurredAt = now();

      const resolved = await adjustMerchantMonthCredit(db, {
        ruc: input.ruc,
        month: input.month,
        sellerUserId: input.sellerUserId,
        reason: input.reason,
        adjustedBy: actor.userId,
        now: occurredAt,
      });

      if (isErr(resolved)) return resolved;

      return Ok({ ok: true as const });
    },
  });

  return json(result, {
    revalidate: [
      ...ATTRIBUTION_QUERY_KEYS,
      QUERY_KEYS.merchantGpv.filterOptions,
    ],
  });
}

export async function setMerchantTarget(raw: {
  ruc: string;
  effectiveFrom: CalendarMonth;
  projectedGpv: number | null;
}) {
  const result = await runAction({
    name: "merchantGpv.target.set",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        effectiveFrom: r.calendarMonth("effectiveFrom"),
        projectedGpv: r.optNum("projectedGpv"),
      })),

    audit: ({ ruc, effectiveFrom }) => ({ ruc, effectiveFrom }),

    execute: async ({ actor, now }, input) => {
      const db = getServerRuntime().infra.db;
      const occurredAt = now();

      const updated = await setTarget(db, {
        ruc: input.ruc,
        effectiveFrom: input.effectiveFrom,
        projectedGpv: input.projectedGpv,
        setBy: actor.userId,
        now: occurredAt,
      });

      if (isErr(updated)) return updated;

      return Ok({ ok: true as const });
    },
  });

  return json(result, { revalidate: ATTRIBUTION_QUERY_KEYS });
}
