import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor }) =>
      Ok(await getMerchantStatsRuntime().executive.progress(actor.userId)),
  });
}
