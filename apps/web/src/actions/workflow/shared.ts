import type { ActorContext } from "~/contracts/workflow/primitives";
import type { AppContext } from "~/server/shared/action-runtime";

export function workflowActorFrom(ctx: AppContext): ActorContext {
  return {
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    branchId: ctx.actor.branchId,
  };
}
