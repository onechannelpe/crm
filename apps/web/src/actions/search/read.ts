"use server";

import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getMySearchAllowance() {
  return runAction({
    name: "search.allowance.read",
    access: { kind: "permission", permission: "capacity:read:self" },

    execute: (ctx) =>
      getSearchCapacitySnapshot(
        ctx.actor.userId,
        getServerRuntime().search.repos,
      ),
  });
}
