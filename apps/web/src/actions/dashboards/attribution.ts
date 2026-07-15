"use server";

import { resolveAttribution as writeResolution } from "~/server/merchant-stats/commands/resolve-attribution";
import { setTarget } from "~/server/merchant-stats/commands/set-target";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { BranchId, UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Ok } from "~/server/shared/result";

// The sales manager's verdict on a RUC-month the ladder could not settle.
// Terminal: an import never revisits a row a human decided.
export async function resolveAttribution(raw: unknown): Promise<{ ok: true }> {
  return runAction({
    name: "dashboards.attribution.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        month: r.str("month"),
        sellerUserId: r.optId("sellerUserId", UserId) ?? null,
        branchId: r.optId("branchId", BranchId) ?? null,
      })),

    audit: (input) => ({ ruc: input.ruc, month: input.month }),

    execute: async (ctx, input) => {
      const db = getServerRuntime().infra.db;
      const now = ctx.now();

      const updated = await writeResolution(db, {
        ruc: input.ruc,
        month: input.month,
        sellerUserId: input.sellerUserId,
        branchId: input.branchId,
        resolvedBy: ctx.actor.userId,
        now,
      });

      if (updated === 0) throwDomain(fail("merchant_attribution_not_found"));

      // The telemetry hook above records that an edit happened; only an event
      // records what it changed to, and only an event reaches the timeline.
      await createEventsRepo(db).append({
        entityType: "merchant_ruc",
        entityId: input.ruc,
        type: "merchant_attribution_resolved",
        actorUserId: ctx.actor.userId,
        subjectUserId: input.sellerUserId,
        payload: { month: input.month, branchId: input.branchId },
        occurredAt: now,
      });

      return Ok({ ok: true as const });
    },
  });
}

// The merchant's projection: one number, "debería rondar los 60k".
//
// Effective-dated, so this is a new version rather than an edit. Months before
// effectiveFrom keep reading the number they were measured against, which is
// what stops a raise today from making a closed month retroactively a miss.
export async function setMerchantTarget(raw: unknown): Promise<{ ok: true }> {
  return runAction({
    name: "dashboards.target.set",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        effectiveFrom: r.str("effectiveFrom"),
        // Null records "no projection from here on", which is not the same claim
        // as a projection of zero: only the first leaves the denominator.
        projectedGpv: r.optNum("projectedGpv"),
      })),

    audit: (input) => ({ ruc: input.ruc, effectiveFrom: input.effectiveFrom }),

    execute: async (ctx, input) => {
      const db = getServerRuntime().infra.db;
      const now = ctx.now();

      await setTarget(db, {
        ruc: input.ruc,
        effectiveFrom: input.effectiveFrom,
        projectedGpv: input.projectedGpv,
        setBy: ctx.actor.userId,
        now,
      });

      await createEventsRepo(db).append({
        entityType: "merchant_ruc",
        entityId: input.ruc,
        type: "merchant_target_set",
        actorUserId: ctx.actor.userId,
        payload: {
          effectiveFrom: input.effectiveFrom,
          projectedGpv: input.projectedGpv,
        },
        occurredAt: now,
      });

      return Ok({ ok: true as const });
    },
  });
}
