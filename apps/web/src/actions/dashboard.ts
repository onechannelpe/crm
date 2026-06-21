"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/server/shared/result";

export async function getDashboardStats() {
  return runAction({
    name: "dashboard.stats.read",
    access: { kind: "permission", permission: "lead:work" },

    execute: async ({ actor }) => {
      const { contactAssignments } =
        getServerRuntime().contactAssignments.repos;

      const activeLeads = await contactAssignments.findActiveByUser(
        actor.userId,
      );

      return Ok({
        activeLeads: activeLeads.length,
      });
    },
  });
}
