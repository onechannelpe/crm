"use server";

import type { RucMerchantStats } from "~/contracts/merchant-stats/views";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getMerchantStatsByRuc } from "~/server/merchant-stats/read/ruc-stats";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, throwDomain } from "~/server/shared/domain-error";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

function parseRuc(raw: unknown): Result<{ ruc: string }, DomainError> {
  if (typeof raw !== "string" || !/^\d{6,}$/.test(raw)) {
    return Err(fail("invalid_ruc"));
  }
  return Ok({ ruc: raw });
}

// The GPV widget on a client record.
//
// Gated on the scoped permission, which every dashboard role also holds, so one
// action serves both audiences. An actor without the org-wide dashboards:read
// only sees a RUC whose live lead is theirs: reading their own clients' GPV is
// the point, reading the whole book from a record page is not.
export async function getMerchantStatsForRuc(
  rawRuc: unknown,
): Promise<RucMerchantStats> {
  return runAction({
    name: "dashboards.ruc.read",
    access: { kind: "permission", permission: "dashboards:read:own" },
    parse: () => parseRuc(rawRuc),
    audit: ({ ruc }) => ({ ruc }),

    execute: async (ctx, { ruc }) => {
      const db = getServerRuntime().infra.db;

      if (!hasPermission(ctx.actor.role, "dashboards:read")) {
        const owns = await ownsRuc(db, ruc, ctx.actor.userId);
        if (!owns) throwDomain(fail("merchant_stats_not_found"));
      }

      return Ok(await getMerchantStatsByRuc(db, ruc));
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
