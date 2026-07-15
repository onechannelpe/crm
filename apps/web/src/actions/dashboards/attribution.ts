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

    audit: ({ ruc, month }) => ({ ruc, month }),

    execute: async ({ actor, now }, input) => {
      const db = getServerRuntime().infra.db;
      const events = createEventsRepo(db);
      const occurredAt = now();

      const updatedCount = await writeResolution(db, {
        ruc: input.ruc,
        month: input.month,
        sellerUserId: input.sellerUserId,
        branchId: input.branchId,
        resolvedBy: actor.userId,
        now: occurredAt,
      });

      if (updatedCount === 0) {
        throwDomain(fail("merchant_attribution_not_found"));
      }

      await events.append({
        entityType: "merchant_ruc",
        entityId: input.ruc,
        type: "merchant_attribution_resolved",
        actorUserId: actor.userId,
        subjectUserId: input.sellerUserId,
        payload: {
          month: input.month,
          branchId: input.branchId,
        },
        occurredAt,
      });

      return Ok({ ok: true as const });
    },
  });
}

export async function setMerchantTarget(raw: unknown): Promise<{ ok: true }> {
  return runAction({
    name: "dashboards.target.set",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        ruc: r.str("ruc"),
        effectiveFrom: r.str("effectiveFrom"),
        projectedGpv: r.optNum("projectedGpv"),
      })),

    audit: ({ ruc, effectiveFrom }) => ({ ruc, effectiveFrom }),

    execute: async ({ actor, now }, input) => {
      const db = getServerRuntime().infra.db;
      const events = createEventsRepo(db);
      const occurredAt = now();

      await setTarget(db, {
        ruc: input.ruc,
        effectiveFrom: input.effectiveFrom,
        projectedGpv: input.projectedGpv,
        setBy: actor.userId,
        now: occurredAt,
      });

      await events.append({
        entityType: "merchant_ruc",
        entityId: input.ruc,
        type: "merchant_target_set",
        actorUserId: actor.userId,
        payload: {
          effectiveFrom: input.effectiveFrom,
          projectedGpv: input.projectedGpv,
        },
        occurredAt,
      });

      return Ok({ ok: true as const });
    },
  });
}
