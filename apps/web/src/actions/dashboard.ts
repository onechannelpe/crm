"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
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
