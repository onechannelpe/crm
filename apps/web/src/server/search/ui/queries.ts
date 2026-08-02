import "server-only";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function getMySearchAllowance() {
  return executeSessionServerFunction({
    name: "search.allowance.read",
    access: { kind: "permission", permission: "capacity:read:self" },

    execute: (ctx) => application.search.getAllowance(ctx.actor.userId, ctx),
  });
}
