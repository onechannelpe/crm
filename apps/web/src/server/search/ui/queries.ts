import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function getMySearchAllowance() {
  return executeSessionServerFunction({
    name: "search.allowance.read",
    access: { kind: "permission", permission: "capacity:read:self" },

    execute: (ctx) =>
      application.search.getAllowance(ctx.actor.userId, ctx.operationAt),
  });
}
