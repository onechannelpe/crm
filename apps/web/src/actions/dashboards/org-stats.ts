"use server";

import type { OrgMerchantStats } from "~/server/merchant-stats/read/contracts";
import { getMerchantStatsByRuc } from "~/server/merchant-stats/read/queries";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail } from "~/server/shared/domain-error";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

function parseRuc(raw: string): Result<{ ruc: string }, DomainError> {
  if (typeof raw !== "string" || !/^\d{6,}$/.test(raw)) {
    return Err(fail("invalid_ruc"));
  }
  return Ok({ ruc: raw });
}

export async function getMerchantStatsForRuc(
  rawRuc: string,
): Promise<OrgMerchantStats> {
  return runAction({
    name: "dashboards.ruc.read",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () => parseRuc(rawRuc),

    execute: async (_ctx, { ruc }) => {
      const db = getServerRuntime().infra.db;
      return Ok(await getMerchantStatsByRuc(db, ruc));
    },
  });
}
