"use server";

import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";

export async function getMySearchAllowance() {
  return runAction({
    name: "search.allowance.read",
    access: { kind: "permission", permission: "capacity:read:self" },

    execute: (ctx) =>
      getSearchCapacitySnapshot(
        ctx.actor.userId,
        getServerRuntime().search.repos,
        ctx.now(),
      ),
  });
}
