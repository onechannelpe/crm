import type { AppContext } from "~/server/shared/action-runtime";
import type { WorkflowActor } from "~/server/workflow/types";

export function workflowActorFrom(ctx: AppContext): WorkflowActor {
  return {
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    branchId: ctx.actor.branchId,
  };
}
