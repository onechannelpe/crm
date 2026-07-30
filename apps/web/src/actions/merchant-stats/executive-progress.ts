"use server";

import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { runAction } from "~/server/platform/action";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  return runAction({
    name: "merchantStats.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor }) =>
      Ok(await getMerchantStatsRuntime().executive.progress(actor.userId)),
  });
}
