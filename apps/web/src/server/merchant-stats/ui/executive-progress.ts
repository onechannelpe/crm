import "server-only";
import type { ExecutiveGpvProgressView } from "~/contracts/merchant-stats/views";
import { loadExecutiveGpvProgress } from "~/server/merchant-stats/read/executive-portfolio";
import { executeSessionServerFunction } from "~/server/platform/action";
import { db } from "~/server/platform/database/db";
import { Ok } from "~/shared/result";

export async function getExecutiveGpvProgress(): Promise<ExecutiveGpvProgressView> {
  return executeSessionServerFunction({
    name: "merchantStats.executiveProgress.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor }) =>
      Ok(await loadExecutiveGpvProgress(db, actor.userId, new Date())),
  });
}
