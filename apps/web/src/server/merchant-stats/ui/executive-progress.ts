import "server-only";
import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  return executeSessionServerFunction({
    name: "merchantStats.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor, operationAt: now }) =>
      Ok(await application.merchantStats.executive.progress(actor.userId, now)),
  });
}
