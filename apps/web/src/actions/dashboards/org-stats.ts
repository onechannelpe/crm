"use server";

import type { RucMerchantStats } from "~/contracts/merchant-stats/views";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getMerchantStatsByRuc } from "~/server/merchant-stats/read/ruc-stats";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  fail,
  throwDomain,
  type DomainError,
} from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export async function getMerchantStatsForRuc(
  rawRuc: unknown,
): Promise<RucMerchantStats> {
  return runAction({
    name: "dashboards.ruc.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    parse: (): Result<{ ruc: string }, DomainError> => {
      if (typeof rawRuc !== "string" || !/^\d{6,}$/.test(rawRuc)) {
        return Err(fail("invalid_ruc"));
      }

      return Ok({ ruc: rawRuc });
    },

    audit: ({ ruc }) => ({ ruc }),

    execute: async ({ actor }, { ruc }) => {
      const db = getServerRuntime().infra.db;

      if (!hasPermission(actor.role, "dashboards:read")) {
        const ownsMerchant = await ownsRuc(db, ruc, actor.userId);

        if (!ownsMerchant) {
          throwDomain(fail("merchant_stats_not_found"));
        }
      }

      const stats = await getMerchantStatsByRuc(db, ruc);

      return Ok(stats);
    },
  });
}

async function ownsRuc(
  db: DatabaseExecutor,
  ruc: string,
  userId: UserId,
): Promise<boolean> {
  const lead = await db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as o", "o.id", "lead.organization_id")
    .select("lead.id")
    .where("o.ruc", "=", ruc)
    .where("lead.executive_id", "=", userId)
    .where("lead.deleted_at", "is", null)
    .executeTakeFirst();

  return lead !== undefined;
}
