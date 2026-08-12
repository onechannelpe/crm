import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  return executeSessionServerFunction({
    name: "merchantStats.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async (ctx) =>
      Ok(
        await application.merchantStats.executive.progress(
          ctx.actor.userId,
          ctx,
        ),
      ),
  });
}
