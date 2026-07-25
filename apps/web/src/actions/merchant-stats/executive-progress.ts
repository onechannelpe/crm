"use server";

import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { loadExecutiveGpvProgress } from "~/server/merchant-stats/read/executive-portfolio";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  return runAction({
    name: "merchantGpv.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor, now }) =>
      Ok(
        await loadExecutiveGpvProgress(
          getServerRuntime().infra.db,
          actor.userId,
          now(),
        ),
      ),
  });
}
